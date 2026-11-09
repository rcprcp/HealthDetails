package com.healthdetails.api;

import com.healthdetails.catalog.TableCatalog;
import com.healthdetails.catalog.TableDefinition;
import com.healthdetails.monitor.MonitorInterval;
import com.healthdetails.monitor.MonitorService;
import com.healthdetails.service.SchemaService;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
public class HealthDetailsResource {

    @Inject
    TableCatalog catalog;

    @Inject
    SchemaService schemaService;

    @Inject
    MonitorService monitorService;

    @GET
    @Path("/views")
    public List<ViewSummary> views() {
        return catalog.all().stream().map(ViewSummary::from).toList();
    }

    @GET
    @Path("/views/{name}")
    public TableData view(
            @PathParam("name") String name,
            @QueryParam("limit") @DefaultValue("5000") int limit,
            @QueryParam("offset") @DefaultValue("0") int offset) {
        return schemaService.fetch(name, limit, offset);
    }

    @GET
    @Path("/battery")
    public Response battery() {
        BatteryStatus status = schemaService.latestBattery();
        if (status == null) {
            return Response.noContent().build();
        }
        return Response.ok(status).build();
    }

    @GET
    @Path("/monitor")
    public MonitorStatus monitor() {
        return monitorService.status();
    }

    @POST
    @Path("/monitor/interval")
    public MonitorStatus setMonitorInterval(@QueryParam("value") String value) {
        return monitorService.setInterval(MonitorInterval.fromValue(value));
    }

    public record ViewSummary(
            String name,
            String label,
            String kind,
            String description,
            boolean chart) {

        static ViewSummary from(TableDefinition definition) {
            return new ViewSummary(
                    definition.name(),
                    definition.label(),
                    definition.kind(),
                    definition.description(),
                    definition.hasChart());
        }
    }
}
