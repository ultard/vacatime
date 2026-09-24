plugins {
    kotlin("jvm") version "2.3.21"
    kotlin("plugin.spring") version "2.3.21"
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("plugin.jpa") version "2.3.21"
}

group = "me.ultard"
version = "0.0.1-SNAPSHOT"
description = "backend"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

repositories {
    mavenCentral()
}

val kotlinFormatter = configurations.create("kotlinFormatter")

dependencies {
    kotlinFormatter("com.pinterest.ktlint:ktlint-cli:1.7.1:all") {
        isTransitive = false
    }
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-liquibase")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.1")
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    implementation("org.apache.commons:commons-csv:1.13.0")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    developmentOnly("org.springframework.boot:spring-boot-docker-compose")
    runtimeOnly("org.postgresql:postgresql")
    testRuntimeOnly("com.h2database:h2")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
    testImplementation("org.springframework.boot:spring-boot-starter-liquibase-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.register<Test>("postgresTest") {
    group = "verification"
    description = "Run integration tests against a dedicated PostgreSQL test database."
    testClassesDirs = sourceSets["test"].output.classesDirs
    classpath = sourceSets["test"].runtimeClasspath
    dependsOn(tasks.testClasses)
    doFirst {
        val databaseUrl =
            providers.environmentVariable("TEST_DB_URL").orNull
                ?: error("TEST_DB_URL must point to a dedicated PostgreSQL test database")
        systemProperty("spring.datasource.url", databaseUrl)
        systemProperty(
            "spring.datasource.username",
            providers.environmentVariable("DB_USER").getOrElse("vacatime"),
        )
        systemProperty(
            "spring.datasource.password",
            providers.environmentVariable("DB_PASSWORD").getOrElse("vacatime"),
        )
        systemProperty("spring.jpa.hibernate.ddl-auto", "validate")
    }
}

tasks.register<JavaExec>("formatKotlin") {
    group = "formatting"
    description = "Format Kotlin sources using the Kotlin style guide."
    classpath = kotlinFormatter
    mainClass.set("com.pinterest.ktlint.Main")
    args("--format", "src/**/*.kt", "*.gradle.kts")
}

tasks.register<JavaExec>("checkKotlinFormat") {
    group = "verification"
    description = "Check Kotlin source formatting without changing files."
    classpath = kotlinFormatter
    mainClass.set("com.pinterest.ktlint.Main")
    args("src/**/*.kt", "*.gradle.kts")
}

tasks.named("check") {
    dependsOn("checkKotlinFormat")
}
