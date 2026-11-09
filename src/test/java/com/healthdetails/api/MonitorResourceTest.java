package com.healthdetails.api;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class MonitorResourceTest {

    @Test
    void schedulesTheTwoHourCollector() {
        given()
                .queryParam("value", "2h")
                .when().post("/api/monitor/interval")
                .then()
                .statusCode(200)
                .body("interval", is("2h"))
                .body("label", is("2 hours"))
                .body("cron", is("0 0 */2 * * ?"))
                .body("active", is(true))
                .body("lastRun", notNullValue())
                .body("nextRun", notNullValue());
    }

    @Test
    void rejectsUnknownInterval() {
        given()
                .queryParam("value", "5m")
                .when().post("/api/monitor/interval")
                .then()
                .statusCode(400);
    }
}
