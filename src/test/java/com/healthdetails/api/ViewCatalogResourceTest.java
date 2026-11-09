package com.healthdetails.api;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

@QuarkusTest
class ViewCatalogResourceTest {

    @Test
    void listsTheJsonBackedViews() {
        given()
                .when().get("/api/views")
                .then()
                .statusCode(200)
                .body("$", hasSize(7))
                .body("[0].name", is("v_hr"))
                .body("[0].label", is("Heartrate"))
                .body("[0].chart", is(true))
                .body("[1].name", is("v_spo2"))
                .body("[1].chart", is(true))
                .body("[2].name", is("v_hrv"))
                .body("[2].chart", is(true))
                .body("[3].name", is("v_bp"))
                .body("[3].label", is("Blood Pressure"))
                .body("[3].chart", is(true))
                .body("[4].name", is("v_temp"))
                .body("[4].chart", is(true))
                .body("[5].name", is("v_steps"))
                .body("[5].chart", is(true))
                .body("[6].name", is("v_sleep"))
                .body("[6].chart", is(true));
    }

    @Test
    void rejectsUnknownViewsWithoutTouchingTheDatabase() {
        given()
                .when().get("/api/views/not_a_real_view")
                .then()
                .statusCode(404);
    }
}
