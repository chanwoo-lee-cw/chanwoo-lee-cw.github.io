---
created_at: 2026-07-19
updated_at: 2026-07-19
tags:
  - ai
  - claude-code
  - context-engineering
---

# Claude Code 컨텍스트 설계하기

## 개요

AI를 사용해서 개발을 하다보면 언제나 느끼는 문제가 있다. 

예를 들면 주문 시스템을 작성할 생각인데, AI는 주문 시스템을 설계 하기 위해서, 기존에 있는 상품 부분을 무시하고 자기 맘대로 설계하고 작성한다.

심지어 다른 함수에 기존에 있는 기능이 있는 경우에 중복해서 생성하기도 하고, 기술 스택을 무시하고 코드를 작성하기도 한다.

즉, 일반적인 기술 스택을 기준으로 코드를 짠다.

아래는 AI를 사용해서 실제로 경험 했던 문제들이다.

- 멀티 모듈 시스템에서 Entity가 Service 아래 Controller까지 사용한다.
- `created_at` / `updated_at`을 모든 Entity에 직접 선언한다. (`@MappedSuperclass`로 묶어야 하는데)
- DB 상에서 가상 칼럼으로 사용하기 위한 칼럼을 굳이 Entity 내에서 생성해서 사용한다.
- `JpaConfig` 파일을 중복으로 생성하고, 위치를 마음대로 이전한다.
- `dockerfile`을 생성하는데 원하는 버전과는 다른 버전의 프레임프레임 워크를 설치

이런 다양한 문제를 매번 수정하거나 검수하게 되는건 굉장히 어렵고, 검수하다보면 미스로 그대로 commit 하게 되는 경우도 많다.



## 컨텍스트 설계

그를 위해서 프로젝트 구조를 2개로 나누었다.

```
프로젝트 루트/
├── CLAUDE.md          # 전역 컨텍스트 (프로젝트 전체에 적용되는 규칙)
└── spec/
    ├── product/
    │   ├── requirements.md   # 기능 요구사항 + 수용 기준
    │   ├── design.md         # API 설계, DB 스키마, 에러 코드
    │   └── tasks.md          # 구현 태스크 체크리스트
    └── category/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

**CLAUDE.md는 전역 컨텍스트**, **spec은 도메인별 컨텍스트** 로 역할을 나누었다.

|                    | CLAUDE.md                       | spec/*.md                     |
| ------------------ | ------------------------------- | ----------------------------- |
| 범위               | 프로젝트 전체                   | 특정 도메인                   |
| 내용               | 기술 스택, 모듈 구조, 코드 규칙 | 요구사항, API 설계, 구현 순서 |
| 업데이트 주기      | 거의 안 바뀜                    | 도메인마다 새로 작성          |
| Claude가 읽는 시점 | 프로젝트를 열 때 자동으로       | 내가 명시적으로 참조할 때     |



## Claude.md

> Claude Code가 프로젝트를 처음으로 열 때, 자동으로 읽는 파일로써, 모든 작업에 항상 적용되어야 하는 규칙을 넣기 위해 작성한다.

```markdown
# 프로젝트 개요
상품 카테고리화 프로젝트

# 기술 스택
- IntelliJ IDEA
- Java 17
- Spring Boot 3.3.4
- QueryDSL 5.1.0
- H2 DB
- Swagger

# 명령어
- `./gradlew build -x test` : 빌드
- `./gradlew :api:bootRun` : api 서버 실행(포트 8080)
- `./gradlew test` : 테스트 전체 실행
- `./gradlew :api:test` : api 모듈 테스트
- `./gradlew :domain:test` : domain 모듈 테스트

# 코드 규칙
- MUST: `created_at`, `updated_at` 는 `@MappedSuperclass`로 묶어둔다
- MUST : `Controller`와 `Request/Response Dto`는 Swagger 문서화한다.
- MUST : 모든 API 는 추가 후에 루트 디렉토리의 http아래에 분류해서 HTTP 요청 추가
- NEVER: .env 파일 커밋 금지
- NEVER: Entity는 Service 아래로 내려가지 않는다.

# 주의사항
- [환경] 개발 단계에서 환경 변수는 local로 한다.
- [인프라] 이미지는 S3에 저장한다.
```

### 주의 사항

- 간결하게 200줄 이내로 작성한다. 500줄 이상이 되면 많은 요소가 무시된다.
- `MUST`, `NEVER` 등의 강한 키워드 작성.
- 실제 명령어를 정확히 기재하여 테스트를 정확히 한다.
- Claude가 이미 잘하는 것도 전부 작성한다.
- 기술 스택이나 규칙이 추가되거나 주의 사항이 추가되는 경우에 정기적으로 업데이트 한다.



### 요소 설명

- **프로젝트 개요**

  - 프로젝트가 무엇을 하는 시스템인지 한두 줄로 작성한다.
  - Claude가 해당 프로젝트의 맥략, 네이밍, 설계 방법을 프로젝트에 어울리게 방향을 잡게 도와준다.
  - 예: "상품 카테고리화 프로젝트" Claude가 임의로 상관없는 도메인 용어를 쓰는 것을 줄일 수 있다.

- **명령어**

  - 빌드, 실행, 테스트 명령어를 실제 프로젝트 기준으로 정확히 기재한다.
  - Claude가 테스트를 돌리거나 빌드를 확인할 때 틀린 명령어를 실행하는 것을 방지할 수 있다.
  - 모듈별 테스트 명령어가 따로 있다면 각각 명시하는 것이 좋다.
  - 예: `./gradlew :domain:test`처럼 모듈 단위로 분리해두면, 전체 테스트 대신 변경된 모듈만 실행한다.

- **모듈 구조**

  - 전체 프로젝트의 모듈 구성과 각 모듈의 역할을 테이블로 정리한다.
  - 멀티 모듈 프로젝트에서 Claude가 가장 자주 저지르는 실수 중 하나인 파일을 잘못된 모듈에 생성하는 것을 막아준다.
  - 예: `api` 모듈에 Entity를 생성하거나, `domain` 모듈에 Controller를 두는 실수
  - 테이블 형식으로 작성하면 Claude가 파악하기 쉽다.

  ```markdown
  | 모듈     | 역할                                        |
  |----------|---------------------------------------------|
  | `api`    | Controller, Request/Response DTO, Application Layer |
  | `domain` | Entity, Service, Repository, DAO            |
  | `common` | 공통 응답 포맷, AOP, Filter, Util           |
  ```

- **코드 규칙**

  - "가급적", "되도록" 같은 모호한 표현 대신 "MUST", "NEVER" 등의 강한 명령어를 사용한다. Claude는 애매한 지시보다 명확한 제약에 훨씬 잘 반응한다.
  - `MUST`는 반드시 따라야 하는 규칙, `NEVER`는 절대 하면 안 되는 규칙으로 구분하면 Claude가 우선순위를 명확하게 인식한다.
  - **NEVER 규칙은 구체적인 사례로 쓸수록 좋다.** `NEVER: Entity를 남용하지 말 것`보다 `NEVER: Entity는 Service 아래로 내려가지 않는다`가 Claude에게 훨씬 명확하다.
  - 규칙은 처음부터 완벽하게 작성할 필요 없다. Claude가 잘못된 코드를 생성할 때마다 해당 패턴을 NEVER 규칙으로 추가해도 된다.

- **주의 사항**

  - **특정 모듈이나 상황에서만 해당되는 맥락적 경고**를 적는 곳이다.
  - 코드 규칙이 프로젝트 전체에 항상 적용되는 강제 규칙이라면, 주의 사항은 "이 상황에서는 이걸 조심해"처럼 맥락에 따라 달라지는 정보다.
  - 태그를 붙이면 Claude가 상황을 더 정확하게 인식한다.
  - **코드 규칙과의 구분**: 위반하면 안 되는 것은 코드 규칙의 NEVER로, 알고 있어야 하는 맥락은 주의 사항으로 나눈다



## Spec

> spec은 지금 작업할 기능에 대한 구체적인 설계다. 도메인 하나를 시작하기 전에 반드시 spec을 먼저 작성한다.

Claude에게 "상품 등록 기능 만들어줘"라고 하면, 그럴싸한 코드가 나오긴 한다. 문제는 **내가 원하는 설계**가 아니라는 점이다. DB 컬럼 이름이 다르고, API 응답 형식이 다르고, 에러 코드 체계가 달라진다. 나중에 수정하는 비용이 처음부터 제대로 알려주는 비용보다 훨씬 크다.

spec은 Claude가 구현을 시작하기 전에 **"이렇게 만들어야 한다"는 사전 합의서** 역할을 한다. 코드를 짜기 전에 설계를 문서로 확정하면, Claude는 그 틀 안에서만 움직이게 된다.

각 도메인마다 세 개의 파일로 구성한다.

| 파일              | 역할                                           |
| ----------------- | ---------------------------------------------- |
| `design.md`       | 어떻게 만들 것인가 (DB, API, 에러 코드)        |
| `requirements.md` | 무엇을 만들 것인가 (요구사항, 범위, 수용 기준) |
| `tasks.md`        | 어떤 순서로 만들 것인가 (구현 체크리스트)      |



### design.md

> 어떻게 만들 것인가에 대해 작성한다.
>
> DB 스키마, API 엔드 포인트, 에러 코드, 상수 등등을 미리 정의해둔다.

`````markdown
# 상품(Product) 설계

## 아키텍처
멀티 모듈 구조를 따른다.
- `api` 모듈: Controller, Request/Response DTO, Application Layer
- `domain` 모듈: Entity, Repository, Service, DAO
- `common` 모듈: 에러 코드

## DB 스키마

```sql
CREATE TABLE product (
                      id         BIGINT AUTO_INCREMENT PRIMARY KEY,
                      code       VARCHAR(255) NOT NULL,
                      name       VARCHAR(255) NOT NULL,
                      price      BIGINT NOT NULL,
                      status     VARCHAR(20)  NOT NULL DEFAULT 'ON_SALE', -- ON_SALE | UNAVAILABLE
                      created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      deleted_at TIMESTAMP        NULL DEFAULT NULL,
                      is_activated BOOLEAN AS (CASE WHEN deleted_at IS NULL THEN TRUE ELSE NULL END),

    UNIQUE KEY uq_product_code_isactivated (code, is_activated)
);

CREATE TABLE product_category (
                               product_id  BIGINT NOT NULL,
                               category_id BIGINT NOT NULL,
                               PRIMARY KEY (product_id, category_id),
                               FOREIGN KEY (product_id)  REFERENCES product(id),
                               FOREIGN KEY (category_id) REFERENCES category(id)
);
````

### 상품 상태 (ProductStatus)

| 값             | 설명              |
| ------------- | ----------------  |
| `ON_SALE`     | 판매 가능 (기본값)      |
| `UNAVAILABLE` | 판매 중단             |
| `SOLD_OUT`    | 품절                |

## API 엔드포인트

### 상품 등록

```
POST /api/products
```

Request Body:

```json
{
  "name": "상품명",
  "price": 2500,
  "categoryIds": [1, 2]
}
```

### 상품 카테고리 변경

```
PATCH /api/products/{productId}/categories
```

Request Body:

```json
{
  "categoryIds": [3]
}
```

### 상품 판매 불가 처리

```
PATCH /api/products/{productId}/status
```

Request Body:

```json
{
  "status": "UNAVAILABLE"
}
```

### 상품 검색

```
GET /api/products?categoryId=1&name=가방&page=0&size=20
```

Response Body:

```json
{
  "code": "SUCCESS",
  "data": {
    "content": [
      {
        "id": 1,
        "name": "아이폰 15",
        "categories": [
            {
                "id": 1
            }
        ]
      }
    ],
    "totalElements": 1,
    "totalPages": 1
  }
}
```

## 에러 처리

| 에러 코드           | HTTP Status | Detail Code       | 설명                  |
| ------------------- | ----------- | ----------------- | --------------------- |
| `PRODUCT_NOT_FOUND` | 404         | product-not-found | 상품을 찾을 수 없음   |
| `CATEGORY_REQUIRED` | 400         | category-required | 카테고리 미입력       |
| `INVALID_STATUS`    | 400         | invalid-status    | 유효하지 않은 상태 값 |
```
`````

- **아키텍처**
  - 각 기능을 어떤 모듈에 배치 할지에 대한 정보
  - `CLAUDE.md`의 모듈 구조에 이미 적혀 있으므로 생략해도 상관 없다.
- **DB 스키마**
  - 실제 DDL 정보 그대로 작성한다.
  - Enum과 상수 값도 같이 작성한다.
- **API 엔드포인트**
  - HTTP 메서드, URL 경로, Request Body, Response Body를 모두 명시한다.
  - Request/Response를 미리 확정해두면 Claude가 DTO 필드를 임의로 추가하거나 응답 구조를 바꾸는 일이 없다.
- **에러 처리**
  - 발생 가능한 에러를 에러 코드, HTTP 상태 코드, 설명 형태로 미리 정의한다.
  - 에러 코드를 미리 정의해두지 않으면, Claude가 매번 다른 네이밍 규칙으로 에러를 만들어낸다. (`ProductNotFoundException`, `ProductNotFound`, `PRODUCT_NOT_FOUND` 등이 혼재하게 된다.)
  - 공통 에러 처리 구조(`RestApiResponse`)와 어떻게 연결되는지도 여기서 명확히 해두면, Claude가 에러 응답 포맷을 일관성 있게 생성한다.



### requirements.md

> 요구사항 명세서이다.
>
> 무슨 기능을 작성할 것인지에 대해 작성한다.

 ```markdown
# 상품(Product) 기능 요구사항

## 기능 요구사항

| ID    | 요구사항                                                     |
| ----- | ------------------------------------------------------------ |
| PR-01 | 상품은 이름(name)과 가격(price) 정보를 가진다                |
| PR-02 | 상품을 새롭게 등록할 수 있다                                 |
| PR-03 | 신규 상품 등록 시 반드시 하나 이상의 카테고리를 지정해야 한다 |
| PR-04 | 상품은 하나 이상의 카테고리를 가질 수 있다                   |
| PR-05 | 상품의 카테고리를 변경할 수 있다                             |
| PR-06 | 상품은 품절 또는 판매 중단 등의 이유로 판매 불가 상태로 전환될 수 있다 |
| PR-07 | 카테고리로 상품을 검색할 수 있다                             |
| PR-08 | 상품명(name)으로 상품을 검색할 수 있다                       |

## 범위 밖 (Out of Scope)
- 상품 삭제 기능
- 주문/재고 이력 관리

## 수용 기준 (Acceptance Criteria)
- [ ] 카테고리 없이 상품 등록 시 에러를 반환한다
- [ ] 판매 불가 처리된 상품은 상태(status)가 UNAVAILABLE로 변경된다
- [ ] 상품명 검색은 부분 일치로 동작한다
 ```

- **기능 요구사항**
  - 구현할 기능을 ID가 붙은 테이블로 나열한다.
  - ID(`PR-01`, `PR-02` 등)를 붙이면 Claude에게 작업 범위를 좁힐 때 명확하게 지시할 수 있다. "PR-02, PR-03만 구현해줘"처럼 숫자로 범위를 지정하면, Claude가 관련 없는 기능까지 같이 구현하는 것을 막을 수 있다.
  - 요구사항은 구현 방법이 아닌 동작 결과로 작성한다.
- **범위 밖 (Out of Scope)**
  - 이 도메인에서 **의도적으로 구현하지 않는** 기능을 명시한다.
  - 빠져 있는 기능을 Claude가 "누락됐다"고 판단하고 알아서 추가하는 것을 막는다.
  - "나중에 추가할 예정"인 기능도 여기에 적어두면, Claude가 미래를 대비한 설계를 임의로 집어넣는 것을 방지할 수 있다.
- **수용 기준 (Acceptance Criteria)**
  - 요구사항이 "제대로 구현됐는지"를 판단하는 구체적인 조건을 체크리스트 형태로 작성한다.
  - "상품 등록 기능을 만들어줘"가 요구사항이라면, 수용 기준은 "카테고리 없이 등록 시 에러를 반환한다"처럼 실제로 통과해야 하는 동작 조건이다.
  - Claude가 테스트 코드를 작성할 때 어떤 케이스를 검증해야 하는지 명확하게 가이드가 된다.



### tasks.md

```markdown
# 태스크: 상품 관리

## Task 1: 상품 등록

### Task 1-1: Product 도메인 모델
- [ ] `Product` 엔티티 (id, code, name, price, status, created_at, updated_at, deleted_at)
- [ ] `ProductCategory` 엔티티 (product_id, category_id)
- [ ] `ProductRepository` (JPA)
- 검증: 엔티티 유닛 테스트 통과

### Task 1-2: ProductRepositoryCustom
- [ ] `ProductRepositoryCustom` (QueryDSL) - 중복 상품 여부 확인 (name)
- 검증: 유닛 테스트
  - name, price가 모두 있을 때만 동작하는지 확인

### Task 1-3: ProductService
- [ ] `save(name, price, categoryIds)` - 상품 등록 (유효성 검사 필수)
- 검증: 유닛 테스트 2개 
  - 정상 등록
  - 필수 값 누락 시 실패

### Task 1-4: ProductApplication
- [ ] `save(name, price, categoryIds)` - 상품 등록 (유효성 검사 필수)
  - [ ] 필수 값(name, price, categoryIds) 누락 시 등록 실패
  - [ ] 카테고리가 최소 1개 이상인지 확인
  - [ ] 중복 상품(name + price) 존재 여부 확인
  - [ ] 판매 불가 상태로는 최초 등록할 수 없음
- 검증: 유닛 테스트 4개 (유효성 검사 중심)

### Task 1-5: 상품 API
- [ ] `ProductRegisterRequest` DTO
- [ ] `POST /api/products` - 상풍 등록
- [ ] Swagger 문서 어노테이션 추가
- 검증: 통합 테스트 통과

### 의존성
- Task 1-5 → Task 1-4, [categories Task 1]에 의존
```

- **Task 단계 분리**
  - 하나의 기능을 레이어 순서대로 잘게 나눠 구현한다. Entity → Repository → Service → Application → Controller 순으로 쌓아 올라가는 구조.
  - Task를 잘게 쪼갬으로써 Claude한테 어떤 레이어를 개발할지 명확하게 지시 할 수 있다.
- **검증 조건**
  - 각 Task 하단에 "검증: ..."으로 완료 기준을 명시한다.
  - Claude는 기본적으로 코드를 다 작성하고 나서 "완료됐습니다"라고 한다. 검증 조건이 없으면 테스트를 실행할지 말지도 Claude 재량이다.
  - "검증: 유닛 테스트 통과"처럼 명시해두면 Claude가 코드 작성 후 반드시 테스트를 실행하고 통과 여부를 확인한다.
  - 검증 케이스 수를 명시하면 ("유닛 테스트 4개") Claude가 빠뜨리는 케이스를 줄일 수 있다.
- **의존성**
  - Task 간 선행 조건을 명시한다.
  - Claude가 의존 관계를 무시하고 순서를 바꾸거나, 아직 없는 인터페이스를 참조하는 코드를 생성하는 것을 막아준다.
  - 다른 도메인과의 의존성도 명시할 수 있다. 예: `[categories Task 1]에 의존`처럼 쓰면 카테고리 기능이 먼저 완료돼야 한다는 것을 Claude가 인식한다.



## 예제

### 코드
[https://github.com/chanwoo-lee-cw/claude-backend](https://github.com/chanwoo-lee-cw/claude-backend)

### Commit 리스트

![](https://velog.velcdn.com/images/alphanewbie/post/1317ad3b-c6d7-43cc-8e5e-07647f4e2c79/image.png)



