package com.healthdetails.monitor;

import com.healthdetails.api.MonitorStatus;
import io.quarkus.scheduler.Scheduler;
import io.quarkus.scheduler.Trigger;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Instant;

@ApplicationScoped
public class MonitorService {

    static final String JOB_ID = "j2208-monitor";

    @Inject
    Scheduler scheduler;

    @Inject
    CollectorService collector;

    private volatile MonitorInterval interval;
    private volatile Instant lastRun;
    private volatile String message = "Monitor is idle";

    public synchronized MonitorStatus status() {
        Trigger job = scheduler.getScheduledJob(JOB_ID);

        return new MonitorStatus(
                interval == null ? null : interval.value(),
                interval == null ? null : interval.label(),
                interval == null ? null : interval.cron(),
                job != null,
                lastRun == null ? null : lastRun.toString(),
                job == null || job.getNextFireTime() == null ? null : job.getNextFireTime().toString(),
                message);
    }

    public synchronized MonitorStatus setInterval(MonitorInterval newInterval) {
        scheduler.unscheduleJob(JOB_ID);
        interval = newInterval;

        scheduler.newJob(JOB_ID)
                .setCron(newInterval.cron())
                .setTask(execution -> apply(newInterval))
                .schedule();

        apply(newInterval);
        return status();
    }

    private void apply(MonitorInterval target) {
        lastRun = Instant.now();

        if (target == MonitorInterval.STREAM) {
            collector.stopBatch();
            collector.ensureStreamRunning();
            message = collector.isStreamRunning()
                    ? "Stream script is running"
                    : "Stream start requested";
            return;
        }

        collector.runBatch();
        message = "Stream stopped; batch script started";
    }
}
