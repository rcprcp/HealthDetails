package com.healthdetails.live;

import com.healthdetails.api.LiveReading;
import com.healthdetails.service.SchemaService;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class LiveService {

    private static final Logger LOG = Logger.getLogger(LiveService.class);

    private final BroadcastProcessor<LiveReading> processor = BroadcastProcessor.create();

    @Inject
    SchemaService schemaService;

    @ConfigProperty(name = "healthdetails.live.poll-ms", defaultValue = "250")
    long pollMs;

    private ScheduledExecutorService poller;
    private volatile String lastKey;
    private volatile long lastErrorLogAt;

    @PostConstruct
    void startPolling() {
        poller = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "j2208-live-poller");
            thread.setDaemon(true);
            return thread;
        });
        poller.scheduleWithFixedDelay(this::pollSafely, 0, pollMs, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    void stopPolling() {
        if (poller != null) {
            poller.shutdownNow();
        }
    }

    private void pollSafely() {
        try {
            poll();
        } catch (RuntimeException e) {
            long now = System.currentTimeMillis();
            if (now - lastErrorLogAt > 30_000) {
                lastErrorLogAt = now;
                LOG.warnf(e, "Could not poll j2208.live");
            }
        }
    }

    void poll() {
        LiveReading reading = schemaService.latestLive();
        if (reading == null) {
            return;
        }

        String key = reading.deviceId() + "|" + reading.ts();
        if (key.equals(lastKey)) {
            return;
        }

        lastKey = key;
        processor.onNext(reading);
    }

    public Multi<LiveReading> stream() {
        return processor;
    }

    public LiveReading latest() {
        return schemaService.latestLive();
    }
}
