package com.healthdetails.monitor;

import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

/**
 * Placeholder for the J2208 collector invocation. The real Python entrypoint
 * lives in the collector project; once it is stable this method should launch
 * it and wait for completion instead of only logging.
 */
@ApplicationScoped
public class CollectorService {

    private static final Logger LOG = Logger.getLogger(CollectorService.class);

    public void collect() {
        LOG.info("STUB: would invoke the J2208 Python collector to fetch and store band data");
    }
}
