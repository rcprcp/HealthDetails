package com.healthdetails.live;

import com.healthdetails.api.LiveReading;
import com.healthdetails.service.SchemaService;
import io.quarkus.scheduler.Scheduled;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

@ApplicationScoped
public class LiveService {

    private static final Logger LOG = Logger.getLogger(LiveService.class);

    private final BroadcastProcessor<LiveReading> processor = BroadcastProcessor.create();

    @Inject
    SchemaService schemaService;

    private volatile String lastKey;

    @Scheduled(every = "PT0.25S", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void poll() {
        try {
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
        } catch (RuntimeException e) {
            LOG.warnf(e, "Could not poll j2208.live");
        }
    }

    public Multi<LiveReading> stream() {
        return processor;
    }

    public LiveReading latest() {
        return schemaService.latestLive();
    }
}
