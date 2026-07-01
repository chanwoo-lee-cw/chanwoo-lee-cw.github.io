---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - redis
  - cache
  - caching
---

# Spring 환경에서 Redis를 이용한 캐싱 방법

## Spring 환경에서 Redis를 이용한 캐싱 방법

### Gradle 설정

```
dependencies {
	...

	// Redis
	implementation("org.springframework.boot:spring-boot-starter-data-redis")
}
```

### 환경 변수 설정

```yml
spring:
  ...
  
  data:
    redis:
      host: localhost
      port: 6379

```

### Redis Config 설정

```kotlin
import org.springframework.boot.autoconfigure.data.redis.RedisProperties
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.cache.RedisCacheConfiguration
import org.springframework.data.redis.cache.RedisCacheManager
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.connection.RedisStandaloneConfiguration
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.RedisSerializationContext
import org.springframework.data.redis.serializer.StringRedisSerializer
import java.time.Duration


@Configuration
@EnableCaching
class RedisConfig(
    private val redisProperties: RedisProperties,
) {

    @Bean
    fun redisConnectionFactory(): LettuceConnectionFactory {
        val config = RedisStandaloneConfiguration(redisProperties.host, redisProperties.port)
        return LettuceConnectionFactory(config)
    }

    @Bean
    fun redisCacheConfiguration() = RedisCacheConfiguration
        .defaultCacheConfig()
        .disableCachingNullValues()
        .prefixCacheNameWith("prefix::")    // 환경에 따라 변경 필요
        .entryTtl(Duration.ofMinutes(5))    // 환경에 따라 변경 필요
        // 캐시 추상화로 저장되는 값의 직렬화는 RedisTemplate이 아니라
        // RedisCacheConfiguration이 결정한다. 명시하지 않으면 JDK 직렬화가 사용된다.
        .serializeValuesWith(
            RedisSerializationContext.SerializationPair
                .fromSerializer(GenericJackson2JsonRedisSerializer())
        )


    @Bean
    fun cacheManager(connectionFactory: RedisConnectionFactory): RedisCacheManager {
        val redisCacheConfiguration = redisCacheConfiguration()

        val cacheManager = RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(
                redisCacheConfiguration
            )
            .transactionAware()
            .withInitialCacheConfigurations(
                redisCacheConfigMap()
            )
            .build()

        return cacheManager
    }


    /**
     * 개별 캐시 설정을 위한 함수
     */
    private fun redisCacheConfigMap(): Map<String, RedisCacheConfiguration> {
        val jsonValue = RedisSerializationContext.SerializationPair
            .fromSerializer(GenericJackson2JsonRedisSerializer())

        return mapOf(
            "productCache" to RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(5))
                .prefixCacheNameWith("product::")
                .disableCachingNullValues()
                .serializeValuesWith(jsonValue),
            "orderCache" to RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .prefixCacheNameWith("order::")
                .disableCachingNullValues()
                .serializeValuesWith(jsonValue),
            "categoriesCache" to RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofDays(10))
                .prefixCacheNameWith("categories::")
                .disableCachingNullValues()
                .serializeValuesWith(jsonValue),
            "personNameCache" to RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .prefixCacheNameWith("personName::")
                .disableCachingNullValues()
                .serializeValuesWith(jsonValue),
        )
    }

    @Bean
    fun redisTemplate(): RedisTemplate<String, Any> {
        val redisTemplate = RedisTemplate<String, Any>()
        redisTemplate.connectionFactory = redisConnectionFactory()

        redisTemplate.keySerializer = StringRedisSerializer()
        redisTemplate.valueSerializer = GenericJackson2JsonRedisSerializer()

        redisTemplate.hashKeySerializer = StringRedisSerializer()
        redisTemplate.hashValueSerializer = GenericJackson2JsonRedisSerializer()
        return redisTemplate
    }

}
```

설정 옵션들

- `LettuceConnectionFactory` Bean :
  - Redis와 연결을 관리하는 커넥션 팩토리.
  - 모든 Redis 연동(`RedisTemplate`, `RedisCacheManager`)은 이 커넥션 팩토리를 통해 Redis 서버와 연결됩니다.
  - Spring Data Redis에서 기본으로 사용하는 Redis 클라이언트가 Lettuce로 연결된다.
    - Lettuce란?
      - Netty 프레임워크 위에 빌드된 비동기 이벤트 기반 네트워크 애플리케이션 프레임워크이다.
      - 동기, 비동기, 리액티브 프로그래밍 모델 모두 지원하는 자바 클라이언트이다.
- `RedisCacheConfiguration` Bean :
  - `defaultCacheConfig`:
    - 스프링이 제공하는 캐시 기본 설정 템플릿을 가져오는 설정
      - key serializer: `StringRedisSerializer` -> 키를 문자열로 저장
      - value serializer : `JdkSerializationRedisSerializer` -> (기본값) 값을 JDK 직렬화 바이트 형태로 저장한다. 단, 위 코드에서는 아래 `serializeValuesWith`로 JSON 직렬화로 오버라이드했다.
      - Null 값 캐싱 : 허용(null 값도 캐시에 저장한다.)
      - key expiration : 영원히(TTL 없음)
      - Prefix: 캐시 이름(`cacheName`)
  - `disableCachingNullValues` : 캐싱할 때 null 값을 허용하지 않음. (메서드가 null을 반환하면 저장을 건너뛴다.)
  - `prefixCacheNameWith` : Redis의 네임스페이스를 분리하기 위해 접두사를 붙이는 부분.
    - `prefix + cacheName + '::' + key` 형태로 캐시 Key가 저장된다.
    - 예시) 아래 `printPersonName`은 캐시 이름이 `personNameCache`, key가 `이름:나이` 형식이므로, `prefixCacheNameWith("prefix::")` 기준이면 실제 키는 `prefix::personNameCache::홍길동:30` 같은 형태가 된다.
  - `entryTtl` : 얼마나 시간이 지난 후에 캐시가 만료되는지 설정한다.
  - `serializeValuesWith` : 캐시에 저장되는 값의 직렬화 방식을 지정한다.
    - `@Cacheable` 같은 캐시 추상화로 저장되는 값의 직렬화는 `RedisCacheConfiguration`이 결정하며, 아래에서 만드는 `RedisTemplate`의 serializer와는 별개의 레이어다.
    - 따라서 이 설정을 생략하면 `RedisTemplate`에 JSON serializer를 걸어두었더라도 캐시 값은 JSON이 아니라 **JDK 직렬화 바이트**로 저장된다. 사람이 읽을 수 있는 JSON으로 저장하려면 위처럼 `GenericJackson2JsonRedisSerializer`를 명시해야 한다.
- `RedisCacheManager` Bean :
  - `.cacheDefaults(redisCacheConfiguration)` :
    - 앞에서 설정한 `RedisCacheConfiguration` Bean 설정 적용.
  - `transactionAware` :
    - 스프링 관리 트랜잭션과 동기화해서, 커밋 후에만 실제 캐시 업데이트가 발생하도록 한다.
    - 데이터베이스와 Redis 캐시 불일치 문제를 방지하기 위해 설정.
    - 기본값은 `false`이며, 켜지 않으면 트랜잭션이 롤백되어도 캐시는 그대로 Redis에 남는다. 그래서 위 코드에서는 `.transactionAware()`를 호출해 동기화를 활성화
  - `withInitialCacheConfigurations`
    - 캐시 이름별로 서로 다른 캐시 설정을 할 수 있도록 해주는 기능이다.
      - `cacheDefaults`는 모든 캐시에 일괄 설정을 하지만, 캐시별로 다른 설정이 필요할 때 사용한다.
    - **캐시 이름별로 서로 다른 캐시 정책(예: TTL, 직렬화, null 캐싱 여부 등)을 적용**할 수 있게 해주는 기능

### 캐시 사용

```kotlin
@Service
class HelloService(
    val printHelloProducer: PrintHelloProducer,
) {

    /**
     * Cacheable
     * 메소드 실행 후에 캐시를 저장한다. 만약 이미 캐싱된 값이 있으면 메소드를 실행하지 않고 캐싱된 값을 반환
     * - value: 캐시 이름 (여러 개 가능)
     * - key: 캐시에 저장할 키
     * - unless: 조건에 따라 캐싱하지 않는다. (반환값 기준)
     * - condition: 조건이 일치하면 캐싱한다. (인자 기준)
     */
    @Cacheable(
        value = ["personNameCache"],
        key = "#helloRequestDto.name + ':' + #helloRequestDto.age"
    )
    fun printPersonName(
        helloRequestDto: HelloRequestDto
    ): HelloResponseDto {
        return HelloResponseDto("success")
    }

    @Cacheable(
        value = ["personNameCache"],
        key = "#helloRequestDto.name + ':' + #helloRequestDto.age",
        condition = "#helloRequestDto.name.length() > 5"
    )
    fun printPersonNameCondition(
        helloRequestDto: HelloRequestDto
    ): HelloResponseDto {
        return HelloResponseDto("success")
    }

    /**
     * CachePut
     * 메소드 실행 후에 항상 캐시를 저장한다. 캐시를 읽지 않는다.
     */
    @CachePut(
        value = ["personNameCache"],
        key = "#helloRequestDto.name + ':' + #helloRequestDto.age",
    )
    fun printPersonNamePut(
        helloRequestDto: HelloRequestDto
    ): HelloResponseDto {
        return HelloResponseDto("success")
    }

    /**
     * CacheEvict
     * 메소드 처리 후에 캐싱을 삭제한다
     * - allEntries: true로 설정하면 캐시의 모든 Entries 삭제
     * - beforeInvocation: 기본은 false, 메서드 실행 성공 후 삭제. true, 메서드 실행 전에 삭제
     */
    @CacheEvict(
        value = ["personNameCache"],
        key = "#helloRequestDto.name + ':' + #helloRequestDto.age",
    )
    fun printPersonNameEvictByKey(
        helloRequestDto: HelloRequestDto
    ): HelloResponseDto {
        return HelloResponseDto("success")
    }

    @CacheEvict(
        value = ["personNameCache"],
        allEntries = true
    )
    fun printPersonNameEvictAll(
        helloRequestDto: HelloRequestDto
    ): HelloResponseDto {
        return HelloResponseDto("success")
    }
  
     /**
     * Caching
     * 여러 개의 캐시 관련 어노테이션을 조합해서 사용한다.
     */
    @Caching(
        put = [CachePut(value = ["userCache"], key = "#user.id")],
        evict = [CacheEvict(value = ["userListCache"], allEntries = true)]
    )
    fun updateUser(user: User): User {
        return userRepository.save(user)
    }
}
```

> [!NOTE]
> **`disableCachingNullValues`와 `unless = "#result == null"`의 차이**
> 둘은 비슷해 보이지만 동작하는 레이어가 다르다. `disableCachingNullValues()`는 **캐시 매니저 레벨**에서 반환값이 null이면 저장을 건너뛰는 설정이고(설정하지 않으면 null도 저장을 시도한다), `unless = "#result == null"`은 **어노테이션 레벨**에서 SpEL로 거르는 것이다. 효과가 겹칠 뿐 "반드시 함께 써야 하는" 관계는 아니다.

### 예시 화면

![redis 결과 이미지](https://velog.velcdn.com/images/alphanewbie/post/43104557-aa67-4284-b79d-a7262c7cf465/image.png)

## 참고 문헌

- [https://hyeri0903.tistory.com/237#%40CacheEvict-1-4](https://hyeri0903.tistory.com/237#%40CacheEvict-1-4)
- https://jake-seo-dev.tistory.com/472
- [https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/cache/RedisCacheConfiguration.html#defaultCacheConfig](https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/cache/RedisCacheConfiguration.html#defaultCacheConfig())
- [https://docs.spring.io/spring-data/redis/docs/1.8.x/api/org/springframework/data/redis/cache/RedisCacheManager.html](https://docs.spring.io/spring-data/redis/docs/1.8.x/api/org/springframework/data/redis/cache/RedisCacheManager.html)