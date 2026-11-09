package com.healthdetails.api;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class MonitorResourceTest {

    @Test
    void startsTheStreamCollector() {
        given()
                .queryParam("value", "stream")
                .when().post("/api/monitor/interval")
                .then()
                .statusCode(200)
                .body("interval", is("stream"))
                .body("label", is("Stream"))
                .body("cron", is("0 * * * * ?"))
                .body("active", is(true))
                .body("message", is("Stream script is running"))
                .body("lastRun", notNullValue())
                .body("nextRun", notNullValue());
    }

    @Test
    void stopsStreamAndStartsTheTwoHourBatch() {
        given()
                .queryParam("value", "2h")
                .when().post("/api/monitor/interval")
                .then()
                .statusCode(200)
                .body("interval", is("2h"))
                .body("label", is("2 hours"))
                .body("cron", is("0 0 */2 * * ?"))
                .body("active", is(true))
                .body("message", is("Stream stopped; history collection runs every 2 hours"))
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
