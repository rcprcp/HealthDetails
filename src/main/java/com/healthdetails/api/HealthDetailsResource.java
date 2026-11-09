package com.healthdetails.api;

import com.healthdetails.catalog.TableCatalog;
import com.healthdetails.catalog.TableDefinition;
import com.healthdetails.service.SchemaService;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
public class HealthDetailsResource {

    @Inject
    TableCatalog catalog;

    @Inject
    SchemaService schemaService;

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
