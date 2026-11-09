package com.healthdetails.monitor;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * Starts and stops the J2208 collector scripts.
 *
 * <p>Live mode runs {@code j2208_collect_live.sh} in the foreground until the
 * user selects the two-hour mode. Two-hour mode runs the transient
 * {@code j2208_collect_once.sh} immediately and then on a two-hour schedule.
 * Switching modes first stops both scripts, every child process they spawned,
 * and any orphaned daemon from an earlier run.</p>
 *
 * <p>The child is started in its own session with {@code setsid} so it keeps
 * running if the Quarkus process restarts. There is deliberately no shutdown
 * hook: the collector only stops when the other mode is selected.</p>
 */
@ApplicationScoped
public class CollectorService {

    private static final Logger LOG = Logger.getLogger(CollectorService.class);

    /** Matches the live wrapper after exec, or the Python daemon it becomes. */
    private static final Pattern LIVE_PROCESS = Pattern.compile(
            "j2208[_-]collect[_-]live\\.sh|j2208[_-]daemon\\.py.*--mode\\s+live");

    /** Matches the one-shot wrapper, its timeout wrapper, and the Python process. */
    private static final Pattern ONCE_PROCESS = Pattern.compile(
            "j2208[_-]collect[_-]once\\.sh|j2208[_-]daemon\\.py.*--once");

    @ConfigProperty(name = "healthdetails.collector.enabled", defaultValue = "true")
    boolean enabled;

    @ConfigProperty(name = "healthdetails.collector.stream-command",
            defaultValue = "/home/bob/j2208-band-tools/tools/j2208_collect_live.sh")
    String streamCommand;

    @ConfigProperty(name = "healthdetails.collector.batch-command",
            defaultValue = "/home/bob/j2208-band-tools/tools/j2208_collect_once.sh")
    String batchCommand;

    private Process liveProcess;
    private Process onceProcess;
    private boolean stubLiveRunning;
    private boolean stubOnceRunning;

    public synchronized boolean isStreamRunning() {
        if (!enabled) {
            return stubLiveRunning;
        }
        if (isAlive(liveProcess)) {
            return true;
        }
        liveProcess = null;
        return !findMatching(LIVE_PROCESS).isEmpty();
    }

    public synchronized boolean isBatchRunning() {
        if (!enabled) {
            return stubOnceRunning;
        }
        if (isAlive(onceProcess)) {
            return true;
        }
        onceProcess = null;
        return !findMatching(ONCE_PROCESS).isEmpty();
    }

    /**
     * Explicitly select streaming: stop everything, then launch the long-lived
     * live collector.
     */
    public synchronized void startStreaming() {
        if (!enabled) {
            stubOnceRunning = false;
            stubLiveRunning = true;
            LOG.infof("STUB: would stop live/once collectors and start stream script '%s'",
                    streamCommand);
            return;
        }

        stopOnce();
        stopStream();
        liveProcess = launch("live collector", streamCommand);
    }

    /**
     * Keep streaming alive without disturbing a live collector that is already
     * running. Used by the one-minute scheduler check.
     */
    public synchronized void ensureStreamRunning() {
        if (!enabled) {
            if (!stubLiveRunning) {
                stubOnceRunning = false;
                stubLiveRunning = true;
                LOG.infof("STUB: would start stream script '%s'", streamCommand);
            }
            return;
        }

        if (isStreamRunning()) {
            return;
        }

        stopOnce();
        liveProcess = launch("live collector", streamCommand);
    }

    /**
     * Stop streaming and any previous history run, then launch one transient
     * history collection.
     */
    public synchronized void runHistoryOnce() {
        if (!enabled) {
            stubLiveRunning = false;
            stubOnceRunning = true;
            LOG.infof("STUB: would stop live collector and start history script '%s'",
                    batchCommand);
            return;
        }

        stopStream();
        stopOnce();
        onceProcess = launch("history collector", batchCommand);
    }

    /**
     * Stop the live collector and every process associated with it.
     */
    public synchronized void stopStream() {
        if (!enabled) {
            if (stubLiveRunning) {
                stubLiveRunning = false;
                LOG.info("STUB: would kill the running stream script");
            }
            return;
        }

        stopProcessTree("live collector", LIVE_PROCESS, liveProcess);
        liveProcess = null;
    }

    /**
     * Stop the history collector and every process associated with it.
     */
    public synchronized void stopOnce() {
        if (!enabled) {
            if (stubOnceRunning) {
                stubOnceRunning = false;
                LOG.info("STUB: would kill the running history script");
            }
            return;
        }

        stopProcessTree("history collector", ONCE_PROCESS, onceProcess);
        onceProcess = null;
    }

    /**
     * Stop both collectors and any orphaned child processes.
     */
    public synchronized void stopAll() {
        stopStream();
        stopOnce();
    }

    private Process launch(String name, String command) {
        try {
            Process process = new ProcessBuilder("setsid", "sh", "-c", command)
                    .redirectOutput(ProcessBuilder.Redirect.INHERIT)
                    .redirectErrorStream(true)
                    .start();
            LOG.infof("Started %s '%s' (pid %d)", name, command, process.pid());
            return process;
        } catch (IOException e) {
            LOG.errorf(e, "Could not start %s '%s'", name, command);
            return null;
        }
    }

    /**
     * Terminate the tracked process plus every process whose command line
     * matches the collector pattern, including children and orphans. The
     * second pass catches processes forked while the first TERM was handled.
     */
    private void stopProcessTree(String name, Pattern pattern, Process tracked) {
        Set<ProcessHandle> roots = new LinkedHashSet<>(findMatching(pattern));
        if (isAlive(tracked)) {
            roots.add(tracked.toHandle());
        }
        if (roots.isEmpty()) {
            LOG.infof("No running %s process to stop", name);
            return;
        }

        Set<ProcessHandle> targets = withDescendants(roots);
        targets.removeIf(handle -> handle.pid() == ProcessHandle.current().pid());
        List<Long> pids = targets.stream().map(ProcessHandle::pid).toList();

        targets.forEach(ProcessHandle::destroy);
        waitForExit(targets, 3_000);

        Set<ProcessHandle> survivors = new LinkedHashSet<>();
        for (ProcessHandle handle : targets) {
            if (handle.isAlive()) {
                survivors.add(handle);
            }
        }
        survivors.addAll(findMatching(pattern));
        Set<ProcessHandle> remaining = withDescendants(survivors);
        remaining.removeIf(handle -> handle.pid() == ProcessHandle.current().pid());
        remaining.stream()
                .filter(ProcessHandle::isAlive)
                .forEach(ProcessHandle::destroyForcibly);

        LOG.infof("Stopped %s process(es): %s", name, pids);
    }

    private static Set<ProcessHandle> withDescendants(Collection<ProcessHandle> roots) {
        Set<ProcessHandle> all = new LinkedHashSet<>();
        Deque<ProcessHandle> queue = new ArrayDeque<>(roots);

        while (!queue.isEmpty()) {
            ProcessHandle handle = queue.removeFirst();
            if (!all.add(handle)) {
                continue;
            }
            handle.children().forEach(queue::addLast);
        }

        return all;
    }

    private static List<ProcessHandle> findMatching(Pattern pattern) {
        List<ProcessHandle> matches = new ArrayList<>();
        try {
            ProcessHandle.allProcesses().forEach(handle -> {
                String commandLine = handle.info().commandLine().orElse("");
                if (pattern.matcher(commandLine).find()) {
                    matches.add(handle);
                }
            });
        } catch (SecurityException e) {
            LOG.warn("Could not inspect running processes", e);
        }
        return matches;
    }

    private static void waitForExit(Collection<ProcessHandle> handles, long timeoutMillis) {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMillis);
        while (System.nanoTime() < deadline
                && handles.stream().anyMatch(ProcessHandle::isAlive)) {
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private static boolean isAlive(Process process) {
        return process != null && process.isAlive();
    }
}
