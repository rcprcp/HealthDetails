package com.healthdetails.monitor;

import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * Starts and stops the J2208 collector scripts.
 *
 * <p>The real scripts live in the separate collector project. Until their
 * command lines are stable, {@code healthdetails.collector.enabled=false}
 * makes this service log the intended start/kill operations and track a
 * simulated running state. Set it to true and provide commands to launch the
 * real processes.
 */
@ApplicationScoped
public class CollectorService {

    private static final Logger LOG = Logger.getLogger(CollectorService.class);

    @ConfigProperty(name = "healthdetails.collector.enabled", defaultValue = "false")
    boolean enabled;

    @ConfigProperty(name = "healthdetails.collector.stream-command", defaultValue = "j2208-stream")
    String streamCommand;

    @ConfigProperty(name = "healthdetails.collector.batch-command", defaultValue = "j2208-batch")
    String batchCommand;

    private Process streamProcess;
    private Process batchProcess;
    private boolean stubStreamRunning;
    private boolean stubBatchRunning;

    public synchronized boolean isStreamRunning() {
        return enabled ? isAlive(streamProcess) : stubStreamRunning;
    }

    public synchronized boolean isBatchRunning() {
        return enabled ? isAlive(batchProcess) : stubBatchRunning;
    }

    /**
     * Start the long-running stream script if it is not already running.
     */
    public synchronized void ensureStreamRunning() {
        if (isStreamRunning()) {
            return;
        }

        if (!enabled) {
            stubStreamRunning = true;
            LOG.infof("STUB: would start stream script '%s'", streamCommand);
            return;
        }

        try {
            streamProcess = start(streamCommand);
            LOG.infof("Started stream script '%s' (pid %d)", streamCommand, streamProcess.pid());
        } catch (IOException e) {
            LOG.errorf(e, "Could not start stream script '%s'", streamCommand);
        }
    }

    /**
     * Stop any running stream script.
     */
    public synchronized void stopStream() {
        if (!enabled) {
            if (stubStreamRunning) {
                stubStreamRunning = false;
                LOG.info("STUB: would kill the running stream script");
            }
            return;
        }

        if (streamProcess != null) {
            kill(streamProcess, "stream");
            streamProcess = null;
        }
    }

    /**
     * Stop the stream script, then start the separate batch script. Any
     * previous batch instance is stopped first so runs cannot overlap.
     */
    public synchronized void runBatch() {
        stopStream();

        if (!enabled) {
            stubBatchRunning = true;
            LOG.infof("STUB: would start batch script '%s'", batchCommand);
            return;
        }

        if (batchProcess != null) {
            kill(batchProcess, "batch");
            batchProcess = null;
        }

        try {
            batchProcess = start(batchCommand);
            LOG.infof("Started batch script '%s' (pid %d)", batchCommand, batchProcess.pid());
        } catch (IOException e) {
            LOG.errorf(e, "Could not start batch script '%s'", batchCommand);
        }
    }

    public synchronized void stopBatch() {
        if (!enabled) {
            if (stubBatchRunning) {
                stubBatchRunning = false;
                LOG.info("STUB: would kill the running batch script");
            }
            return;
        }

        if (batchProcess != null) {
            kill(batchProcess, "batch");
            batchProcess = null;
        }
    }

    @PreDestroy
    void shutdown() {
        stopStream();
        stopBatch();
    }

    private static Process start(String command) throws IOException {
        return new ProcessBuilder("sh", "-c", command)
                .redirectOutput(ProcessBuilder.Redirect.INHERIT)
                .redirectErrorStream(true)
                .start();
    }

    private static boolean isAlive(Process process) {
        return process != null && process.isAlive();
    }

    private static void kill(Process process, String name) {
        if (!process.isAlive()) {
            return;
        }

        process.destroy();
        try {
            if (!process.waitFor(2, TimeUnit.SECONDS)) {
                process.destroyForcibly();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
        }
        LOG.infof("Stopped %s script", name);
    }
}
