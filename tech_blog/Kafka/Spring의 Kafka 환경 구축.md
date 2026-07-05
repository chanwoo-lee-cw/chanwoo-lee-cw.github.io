---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - kafka
  - spring
  - configuration
  - docker
---

# Spring의 Kafka 기초 환경 구축



## 시작하며

서비스 간의 비동기 연결이 필요한 경우에 가장 자주 쓰이는 서비스이다.

이전에도 정리해 본적 있지만, 카프카의 가장 대표적인 특징이 아래와 같은데

1. **비동기 처리**: 생산자와 소비자가 동시에 동작하지 않아도 된다.
2. **비결합성**: 생산자와 소비자가 직접 통신하지 않아도 되므로 시스템이 유연해진다.
3. **내구성**: 메시지를 큐에 안전하게 저장했다가, 나중에 소비자가 직접 가져가는 방식.
4. **확장성**: 소비자를 여러 개 두면 병렬 처리가 가능하다.

이런 특성 때문에 굉장히 자주 쓰이게 된다.



그래서 가장 자주 쓰이는 서비스이니, 한번 Kotlin-Spring과 연동해서 서버를 띄우는 방법을 구현해보도록 하였다. 



## Kafka 세팅

### docker 세팅

일단, 기본적인 Kafka 서비스를 구축하기 위해서 Docker를 사용해서 Test 환경을 구축한다.

```yml
# docker-compose.yml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"		# 외부 Kafka Port
      - "29092:29092"  # 내부 통신용
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    container_name: schema-registry
    depends_on:
      - kafka
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://kafka:29092
      
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    ports:
      - "8082:8080"
    depends_on:
      - kafka
      - schema-registry
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
      KAFKA_CLUSTERS_0_SCHEMAREGISTRY: http://schema-registry:8081
```

위의 docker-compose은 기본적인 Kafka와 함께 

`schema-registry` 와 `kafka-ui`를 같이 띄우는 파일이다.



### 예시 화면

`kafka-ui` 화면이 접속하면

![](https://velog.velcdn.com/images/alphanewbie/post/bd9ecebc-d8be-48bc-881f-62533e9aa334/image.png)

이와 같은 화면을 볼 수 있다.

단, 단 처음 접속시에는 아무런 Cluster가 표시되지 않는다.



## Spring 세팅

### gradle 초기 세팅

`build.gradle.kts`에 아래와 같은 설정들을 추가한다.

```
plugins {
		...
    kotlin("kapt") version "1.9.25"
		...
    // avro
    id("com.github.davidmc24.gradle.plugin.avro") version "1.9.1"
}
```

- `kotlin("kapt")` : Kotlin에서 어노테이션 기반으로 코드를 생성할 수 있게 한다.
- `id("com.github.davidmc24.gradle.plugin.avro")`  : Spring을 Build할 때 avsc를 자동으로 Kotlin 코드로 생성할 수 있게 해주는 부분



```
repositories {
    ...
    maven("https://packages.confluent.io/maven/")
}
```

- 밑의 dependencies가 confluent에서 받아오기 때문에 레포지토리를 추가한다



```
dependencies {
    // Logging
    implementation("io.github.microutils:kotlin-logging-jvm:3.0.5")

    // kafka
    implementation("org.springframework.kafka:spring-kafka")

    // avro
    kapt("org.apache.avro:avro:${avroVersion}")
    implementation("org.apache.avro:avro:${avroVersion}")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-avro:2.14.2")

    kapt("io.confluent:kafka-avro-serializer:${avroSerializer}")
    implementation("io.confluent:kafka-avro-serializer:${avroSerializer}")
}
```



```
avro {
    stringType.set("String")
    fieldVisibility.set("PRIVATE")
}
```

- `stringType.set("String")` : 
  - Avro에서 문자열 타입을 `Utf8` 대신 일반 `String`으로 생성하도록 설정한다.

- `fieldVisibility.set("PRIVATE")`: 
  - 생성되는 Avro 클래스 필드의 접근 제어자를 `private`으로 설정



```
sourceSets {
    main {
        java {
            srcDirs("build/generated-main-avro-java")
        }
    }
}
```

- `srcDirs("build/generated-main-avro-java")` : 
  - Avro 플러그인이 `*.avsc` 파일에서 **자동 생성한 Java 소스 코드**의 위치를 지정하는 부분
  - Avro가 생성한 클래스를 컴파일 대상에 포함시키기 위해 설정한다.



### 환경 변수 세팅

```yml
# application-local.yml
spring:
  config:
    activate:
      on-profile: local

  application:
    name: kafka-producer-spring

  kafka:
    producer:
      bootstrap-servers: http://localhost:9092
      acks: 1
      retries: 3
    properties:
      schema-registry-url: http://localhost:8081
      auto.register.schemas: true		# 테스트 환경에서만 true 추천


application:
  kafka-topic:
    print-hello: local-print-hello
```

- `on-profile` : local세팅이므로 local로 세팅한다. 각자 환경에 따라 설정한다.
- `application.name`  : 필요하진 않은 설정이지만, Kafka메세지에 어디서 발행한 메세지인지 추가하면, 흐름을 추적하기 좋으므로 추가한다.
- `kafka.producer.bootstrap-servers` : Kafka 서버의 주소를 추가한다. 만약 서버가 여러 개라면 `http://localhost:9092, http://localhost:9093` 같은 방식으로 추가한다.
- `kafka`가 producer의 디폴트 값으로 사용할 ack을 1로 설정한다.
- `retries` 는 retries으로 설정한다. 즉, Producer의 Kafka로 메세지 전송이 실패가 3번까지 재전송한다는 뜻이다.
- `auto.register.schemas` : Producer에서 토픽을 보냈을시 그걸 자동으로 스키마 레지스트리에 등록하는지에 대한 여부이다. 운영환경에선 False로 등록하고 직접 등록하는 것으로 버전 에러가 없게하는것이 추천된다.



### Spring  세팅

`src/main/avro` 디렉토리를 생성한다.

해당 디렉토리 안에 원하는 형태의 `*asvc` 파일 json 형태로 생성한다.

```json
// src/main/avro/print-hello.avsc
{
  "type": "record",
  "name": "PrintHelloVo",
  "namespace": "com.example.avro.schema",
  "doc": "HelloWorld 테스트",
  "fields": [
    {
      "name": "sender",
      "type": "string"
    },
    {
      "name": "publishDateTime",
      "type": "string"
    },
    {
      "name": "printMessage",
      "type": "string"
    }
  ]
}
```

테스트 용도로 하나의 VO를 작성했다.



### Spring Producer 세팅

```kotlin
// src/main/kotlin/com/example/kafkaspring/common/config/KafkaProducerConfig.kt
package com.example.kafkaspring.common.config

import com.example.avro.schema.PrintHelloVo
import io.confluent.kafka.serializers.KafkaAvroDeserializerConfig
import io.confluent.kafka.serializers.KafkaAvroSerializer
import org.apache.kafka.clients.producer.ProducerConfig
import org.apache.kafka.common.serialization.StringSerializer
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.core.DefaultKafkaProducerFactory
import org.springframework.kafka.core.ProducerFactory


@Configuration
class KafkaProducerConfig(
    @Value("\${spring.kafka.producer.bootstrap-servers}") val kafkaBootstrapServers: String,
    @Value("\${spring.kafka.properties.schema-registry-url}") val schemaRegistryUrl: String,
    @Value("\${spring.kafka.producer.acks}") val acks: String,
    @Value("\${spring.kafka.producer.retries}") val retries: Int,
) {

    @Bean
    fun defaultKafkaProducerContainerFactory(): ProducerFactory<Any, Any> {
        val producerConfig = getKafkaProducerConfig()
        return DefaultKafkaProducerFactory<Any, Any>(producerConfig)
    }

    @Bean
    fun printHelloKafkaProducerContainerFactory(): ProducerFactory<String, PrintHelloVo> {
        val producerConfig = getKafkaProducerConfig()
        return DefaultKafkaProducerFactory(producerConfig)
    }

    fun getKafkaProducerConfig(): Map<String, Any> = mapOf(
        ProducerConfig.BOOTSTRAP_SERVERS_CONFIG to kafkaBootstrapServers,
        ProducerConfig.ACKS_CONFIG to acks,
        ProducerConfig.RETRIES_CONFIG to retries,
      //  ProducerConfig.RETRIES_CONFIG to 60,
			//  ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG to 10_000,
        ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG to StringSerializer::class.java,
        ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG to KafkaAvroSerializer::class.java,
        KafkaAvroDeserializerConfig.SCHEMA_REGISTRY_URL_CONFIG to schemaRegistryUrl,
    )
}
```

Kafka Producer의 설정을 세팅한다



Producer의 세팅을 한다.

```kotlin
// src/main/kotlin/com/example/kafkaspring/producer/KafkaProducer.kt
package com.example.kafkaspring.producer

import mu.KotlinLogging
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.messaging.Message
import org.springframework.stereotype.Component

@Component
class KafkaProducer(
    private val kafkaTemplate: KafkaTemplate<Any, Any>,
) {
    val log = KotlinLogging.logger { }

    fun send(message: Message<*>) {
        val future = kafkaTemplate.send(message)
        try {
            val response = future.get()
          	log.info { "[KafkaProducer.send] topic - ${response.recordMetadata.topic()} :: partition - ${response.recordMetadata.partition()}, offset - ${response.recordMetadata.offset()}" }
        } catch (e: Exception) {
            log.error { "[KafkaProducer.send] ${e} :: header - ${message.headers}, body - ${message.payload}" }
        }
    }

}
```

메세지의 형태로 Kafka의 토픽을 보낼 예정이니 Kafka Producer sender를 메세지로 세팅한다.





```kotlin
// src/main/kotlin/com/example/kafkaspring/producer/PrintHelloVoProducer.kt
package com.example.kafkaspring.producer

import com.example.avro.schema.PrintHelloVo
import com.example.kafkaspring.dto.PrintHelloDto
import mu.KotlinLogging
import org.springframework.beans.factory.annotation.Value
import org.springframework.kafka.support.KafkaHeaders
import org.springframework.messaging.support.MessageBuilder
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class PrintHelloVoProducer(
    private val kafkaProducer: KafkaProducer,
    @Value("\${application.kafka-topic.print-hello:}")
    private val printHelloTopic: String,
    @Value("\${spring.application.name:}")
    private val applicationName: String,
) {

    private val log = KotlinLogging.logger { }

    fun sendHelloPrint(dto: PrintHelloDto) {
        log.info { "[PrintHelloProducer.sendHelloPrint] publish printHelloVo, topic - ${printHelloTopic}, dto-${dto}" }
      
        val key = "from-${applicationName}-message"		// 메세지 ID는 어느 파티션에 들어갈지 여부니 매우 중요
        kafkaProducer.send(
            MessageBuilder
                .withPayload(
                    PrintHelloVo.newBuilder()
                        .setSender(applicationName)
                        .setPrintMessage(dto.message)
                        .setPublishDateTime(Instant.now().toString())
                        .build()
                )
                .setHeader(KafkaHeaders.TOPIC, printHelloTopic)
                .setHeader(KafkaHeaders.KEY, key)
                .build()
        )
    }
}
```

위의 환경 변수에서 생성한 `print-hello`를 생성한 다음에 해당 메세지를 넣어준다.

`PrintHelloVo`를 보내는 카프카 Producer를 생성한다.



### 예시 화면

![](https://velog.velcdn.com/images/alphanewbie/post/c8127f18-e014-4161-b7eb-ec11b47164e9/image.png)



해당 `sendHelloPrint` 함수를 실행해서 카프카 메세지를 보내게 되면 위에 선언된 토픽에 따라 메세지가 추가되는 것을 볼 수가 있다. 
