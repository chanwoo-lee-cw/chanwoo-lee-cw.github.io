---
created_at: 2026-07-19
updated_at: 2026-07-19
tags:
  - ai
  - mcp
  - protocol
---

# MCP

## MCP란?

> AI 애플리케이션을 외부 시스템에 연결하기 위한 오픈 소스 표준으로, AI 모델이 외부 서비스나 도구와 표준화된 방식으로 통신할 수 있게 해주는 프로토콜입니다.

즉, MCP는 AI 애플리케이션을 외부 시스템에 연결하는 표준화된 방법을 제공하는 것을 말한다.

## MCP가 필요한 이유

AI 모델은 근본적으로 학습 시점까지 익힌 데이터로 밖에 대답하지 못하고, 외부 세계와 상호작용을 처리해달라는 요청을 해결하지는 못한다.

그래서, AI 모델을 외부 서비스와 연동하려면, 서비스마다 별도의 연동 코드를 작성해야했지만, MCP로 하나의 표준 프로토콜을 정해놓고, 모든 서비스가 이 규격에 맞춰 MCP 서버를 만들면 어떤 AI 모델이든 동일한 방식으로 연결할 수 있도록 한다.

## MCP 아키텍처 및 구성요소

```mermaid
flowchart LR
  subgraph MCP 호스트
    Claude[Claude]

    MCP1[MCP Client]
    MCP2[MCP Client]
    MCP3[MCP Client]
  end

  subgraph MCP 서버
    GmailMCP[Gmail MCP Server]
    CalendarMCP[Calendar MCP Server]
    SlackMCP[Slack MCP Server]
  end

  GmailAPI[Gmail API]
  CalendarAPI[Google Calendar API]
  SlackAPI[Slack API]

  Claude --> MCP1 --> GmailMCP --> GmailAPI
  Claude --> MCP2 --> CalendarMCP --> CalendarAPI
  Claude --> MCP3 --> SlackMCP --> SlackAPI
```

### MCP 호스트

AI 애플리케이션 자체입니다. Claude.ai, Claude Desktop, Cursor, Windsurf, VS Code(Copilot) 등 다양한 AI 도구가 여기에 해당합니다. 일반적으로 사용자의 상호작용 지점이며, MCP 호스트는 LLM을 사용하여 외부 데이터나 도구가 필요할 수 있는 요청을 처리합니다.

### MCP 클라이언트

호스트 안에서 각 MCP 서버와 1:1로 연결을 유지하는 중간 계층입니다. 하나의 호스트가 여러 클라이언트를 가질 수 있다. MCP 클라이언트는 LLM과 MCP 서버가 서로 통신하도록 도와줍니다. MCP에 대한 LLM의 요청을 변환하고 LLM에 대한 MCP의 대답을 변환합니다. 또한 서버 연결 시 사용 가능한 도구 목록을 미리 가져와 LLM의 컨텍스트에 제공합니다.

### MCP 서버

실제 외부 서비스를 감싸는 경량 프로그램입니다. Gmail MCP 서버, Google Calendar MCP 서버 등이 각각 존재하며, 표준화된 방식으로 자신이 제공하는 기능을 노출한다. 데이터베이스 및 웹 서비스와 같은 외부 시스템에 연결하여 LLM이 이해할 수 있는 형식으로 변환함으로써 개발자가 다양한 기능을 제공할 수 있도록 LLM을 지원한다.

### 전송 계층

클라이언트와 서버 간의 데이터 교환을 가능하게 하는 통신 메커니즘과 채널을 정의한다. 전송 계층은 JSON-RPC 2.0 메시지를 사용하여 클라이언트와 서버 간에 통신하며, 주로 다음 두 가지 전송 방법을 사용합니다.

- **표준 입력/출력(stdio):** 로컬 프로세스 간 통신에 적합하며 빠른 동기식 메시지 전송을 제공합니다. Claude Desktop 등에서 로컬 MCP 서버를 실행할 때 주로 사용합니다.
- **Streamable HTTP:** 원격 서버 통신에 권장되는 방식으로, 단일 HTTP 엔드포인트를 통해 요청/응답과 실시간 스트리밍을 모두 처리합니다. 기존의 SSE(Server-Sent Events) 방식을 대체하며, 상태 유지(Stateful)와 비상태(Stateless) 모드를 모두 지원합니다.


### 인증 (Authentication)

원격 MCP 서버와 통신할 때는 인증이 필요합니다. MCP는 **OAuth 2.1** 기반의 인증/인가 프레임워크를 지원합니다. 클라이언트가 원격 서버에 처음 연결할 때 OAuth 흐름을 통해 인증을 수행하며, 이를 통해 사용자의 권한 범위 내에서 안전하게 외부 서비스에 접근할 수 있습니다.

## MCP의 작동 방식

> Model Context Protocol의 핵심은 LLM이 외부 도구에 도움을 요청하여 쿼리에 답변하거나 작업을 완료할 수 있도록 한다.

```mermaid
sequenceDiagram
    autonumber
    participant User as 사용자
    participant Host as MCP 호스트 (LLM)
    participant Client as MCP 클라이언트
    participant Server as MCP 서버
    participant External as 외부 시스템

    Note over Client, Server: 초기화 단계
    Client->>Server: 연결 및 도구 목록 요청 (tools/list)
    Server-->>Client: 사용 가능한 도구 목록 반환
    Client-->>Host: LLM 컨텍스트에 도구 목록 제공

    Note over User, External: 실행 단계
    User->>Host: "최신 판매 보고서를 관리자에게 보내줘"
    Host->>Client: database_query 도구 호출 요청
    Client->>Server: 도구 실행 요청 전달
    Server->>External: SQL 쿼리 실행
    External-->>Server: 판매 보고서 데이터 반환
    Server-->>Client: 포맷된 결과 반환
    Client-->>Host: 결과 전달

    Host->>Client: email_sender 도구 호출 요청
    Client->>Server: 도구 실행 요청 전달
    Server->>External: 이메일 발송
    External-->>Server: 발송 완료 확인
    Server-->>Client: 완료 확인 반환
    Client-->>Host: 결과 전달

    Host-->>User: "최신 판매 보고서를 찾아서 관리자에게 이메일로 보냈습니다."
```

1. **초기화 및 도구 탐색:** MCP 클라이언트가 서버에 연결될 때 사용 가능한 도구 목록을 미리 가져와 LLM의 컨텍스트에 제공합니다. LLM은 이 목록을 바탕으로 어떤 도구를 사용할 수 있는지 파악합니다.
2. **도구 호출:** LLM이 사용자의 요청을 분석하고, 적절한 도구를 선택하여 구조화된 요청을 생성합니다. 예를 들어, 보고서 이름을 지정하여 database_query 도구를 호출합니다. MCP 클라이언트가 이 요청을 적절한 MCP 서버로 전달합니다.
3. **외부 작업 및 데이터 반환:** MCP 서버는 요청을 수신하고 이를 회사의 데이터베이스에 대한 보안 SQL 쿼리로 변환하여 판매 보고서를 검색합니다. 그런 다음 이 데이터를 포맷하여 LLM에 다시 보냅니다.
4. **두 번째 작업 및 응답 생성:** 이제 보고서 데이터를 확보한 LLM은 email_sender 도구를 호출하여 관리자의 이메일 주소와 보고서 콘텐츠를 제공합니다. 이메일이 전송된 후 MCP 서버는 작업이 완료되었음을 확인합니다.
5. **최종 확인:** LLM이 최종 응답을 제공합니다. '최신 판매 보고서를 찾아서 관리자에게 이메일로 보냈습니다.'

## MCP의 장점

1. **할루시네이션 감소** : LLM은 본질적으로 실시간 정보가 아닌 학습 데이터를 기반으로 대답을 예측하기 때문에 때로는 사실을 꾸며내거나 그럴듯하지만 잘못된 정보인 할루시네이션 현상이 발생하는데, 외부의 신뢰할 수 있는 데이터 소스에 액세스 함으로써 줄일 수 있다.
2. **AI 유용성 및 자동화 향상** : 외부 도구에 직접 연결함으로써 LLM은 더 이상 단순한 채팅 프로그램이 아니라 독립적으로 행동할 수 있는 스마트 에이전트가 되며, 이는 훨씬 더 많은 작업을 자동화할 수 있다.
3. **AI를 위한 간편한 연결** : 기존에 AI 모델이 외부 서비스와 연동하려면, 각 서비스마다 별도의 통합 코드를 작성해야 했고, 그로 인해 서비스가 N개이고 AI 모델이 M개라면, N×M개의 연동을 만들어야 하는 비효율이 발생했습니다. MCP는 이러한 연결을 공통형 개발 표준을 제공함으로써 생산성을 향상시킬 수 있다.
4. **보안 및 사용자 제어** : MCP는 도구 호출 시 사용자 승인(Human-in-the-loop)을 요구할 수 있도록 설계되었습니다. 이메일 발송, 결제, 데이터 삭제 등 부작용이 있는 작업에서 사용자 확인을 거치는 흐름을 통해, AI가 사용자의 의도와 다른 행동을 하는 것을 방지합니다.

# MCP 서버

```mermaid
flowchart TB

    %% Top Layer
    User
    App
    Model

    User -->|명시적 선택| Prompts
    App -->|자동 관리| Resources
    Model -->|자율 판단| Tools

    %% Prompts
    subgraph Prompts
        P1[사전 정의된 워크플로 템플릿]
        P2["슬래시 커맨드 호출
        매개변수화된 입력
        도구+자원 조합 가능
        자동 완성 지원"]

        P3["예시:
        /plan-vacation
        /summarize-meetings
        /draft-email"]

        P4["API:
        prompts/list
        prompts/get"]
    end

    %% Resources
    subgraph Resources
        R1[읽기 전용 데이터 소스]

        R2["URI로 식별
        MIME 타입 선언
        직접 자원 / 템플릿
        변경 구독 가능"]

        R3["예시:
        file:///docs/report.md
        calendar://events/2024
        weather://{city}/{date}"]

        R4["API:
        resources/list
        resources/read
        resources/subscribe"]
    end

    %% Tools
    subgraph Tools
        T1[실행 가능한 함수]

        T2["JSON Schema 입력 검증
        부작용 있음 (쓰기/호출)
        사용자 승인 요구 가능
        LLM이 자율적으로 호출"]

        T3["예시:
        searchFlights()
        sendEmail()
        createCalendarEvent()"]

        T4["API:
        tools/list
        tools/call"]
    end
```

## 핵심 서버 기능

| Feature   | Explanation                                                  | 예시                                                   | 제어의 주체  |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------ | ------------ |
| Tools     | LLM이 호출할 수 있는 함수                                    | 검색 항공편<br/>메시지 보내기<br/>캘린더 이벤트 생성   | 모델         |
| Resources | LLM이 읽을 수 있는 데이터 소스. 파일, 데이터베이스 레코드, API 응답 등이 해당됩니다. URI 형태로 식별되며, AI의 컨텍스트에 포함될 수 있다. | 문서 검색<br/>지식 기반 접근<br/>달력 읽기             | 애플리케이션 |
| Prompts   | 특정 작업에 최적화된 프롬프트 템플릿. 서버가 미리 정의한 워크플로우를 사용자가 쉽게 활용할 수 있게 한다. | 휴가 계획하기<br/>회의 요약<br/>이메일 초안 작성       | 사용자       |
| Sampling  | MCP 서버가 클라이언트를 통해 LLM에게 완성(completion)을 요청할 수 있는 역방향 호출 메커니즘. 서버가 복잡한 작업 중간에 LLM의 판단이 필요할 때 사용한다. | 에이전트 작업 중 중간 판단<br/>복잡한 데이터 해석 요청 | 서버         |
| Roots     | 클라이언트가 서버에게 자신이 관심 있는 파일 시스템 경로나 URI를 알려주는 기능. 서버가 작업 범위를 이해하는 데 도움을 준다. | 프로젝트 디렉토리 지정<br/>작업 범위 한정              | 클라이언트   |

### Tools

도구를 사용하면 AI 모델이 작업을 수행할 수 있습니다. 각 도구는 입력과 출력을 입력하여 특정 작업을 정의합니다. 모델은 컨텍스트를 기반으로 도구 실행을 요청합니다.

#### **Tool 작동 방식**

JSON 스키마로 이루어진 LLM이 호출할 수 있는 스키마 정의 인터페이스. 각 도구는 정의된 입력과 출력으로 단일 작업을 수행한다.

**프로토콜 작업:**

| Method       | 목적                   | Return                          |
| :----------- | :--------------------- | :------------------------------ |
| `tools/list` | 사용 가능한 tools 발견 | 스키마가 포함된 tools 정의 배열 |
| `tools/call` | 특정 tools 실행        | 도구 tools 결과                 |

**비행 검색 tools 정의 예시:**

```json
{
  "name": "searchFlights",
  "description": "Search for available flights",
  "inputSchema": {
    "type": "object",
    "properties": {
      "origin": { "type": "string", "description": "Departure city" },
      "destination": { "type": "string", "description": "Arrival city" },
      "date": { "type": "string", "format": "date", "description": "Travel date" }
    },
    "required": ["origin", "destination", "date"]
  }
}
```

```
searchFlights(origin: "NYC", destination: "Barcelona", date: "2024-06-15")
```

### Resources

리소스는 AI 애플리케이션이 검색하여 모델에 제공할 수 있는 정보에 대한 구조화된 접근을 제공한다.

#### Resources 작동 방식

리소스는 AI가 맥락을 이해하는 데 필요한 파일, API, 데이터베이스 또는 기타 소스의 데이터를 노출한다. 애플리케이션은 이 정보에 직접 액세스하여 관련 부분을 선택하거나 임베딩으로 검색하거나 모델에 모두 전달하는 등 사용 방법을 결정할 수 있습니다.

리소스는 두 가지 발견 패턴을 지원합니다:

- 직접 리소스 - 특정 데이터를 가리키는 고정 URI
  - `calendar://events/2024` - 2024년 캘린더 이용 가능 여부 반환
- 리소스 템플릿 - 유연한 쿼리를 위한 매개변수가 있는 동적 URI. 예:
  - `travel://activities/{city}/{category}` - 도시 및 카테고리별 활동 반환
  - `travel://activities/barcelona/museums` - 바르셀로나의 모든 박물관을 반환

**프로토콜 작업 :**

| Method                     | 목적                         | Return                            |
| -------------------------- | ---------------------------- | --------------------------------- |
| `resources/list`           | 사용 가능한 직접 리소스 나열 | 리소스 설명자 배열                |
| `resources/templates/list` | 리소스 템플릿 검색           | 리소스 템플릿 정의 배열           |
| `resources/read`           | 리소스 콘텐츠 검색           | 메타데이터가 포함된 리소스 데이터 |
| `resources/subscribe`      | 리소스 변경 모니터링         | 구독 확인                         |

### Prompts

프롬프트는 재사용 가능한 템플릿을 제공하고, MCP 서버 작성자는 도메인에 대해 매개변수화된 프롬프트를 제공할 수 있다.

#### Prompts 작동 방식

프롬프트는 예상 입력과 상호작용 패턴을 정의하는 템플릿으로, 가장 큰 차이점은 사용자가 명시적으로 호출을 한다. 그리고 Prompts는 단순 텍스트가 아니라 구조화된 입력을 받음으로써, 자연어로 설명하는 것보다 일관된 결과를 얻을 수 있습니다.

Prompts는 Tools와 Resources를 조합하는 오케스트레이션 역할입니다.

**프로토콜 작업:**

| Method         | 목적                      | Return                           |
| -------------- | ------------------------- | -------------------------------- |
| `prompts/list` | 사용 가능한 프롬프트 검색 | 프롬프트 설명자 배열             |
| `prompts/get`  | 프롬프트 세부 정보 검색   | 인수를 포함한 전체 프롬프트 정의 |

### Sampling

Sampling은 MCP 서버가 클라이언트를 통해 LLM에게 텍스트 완성(completion)을 요청할 수 있는 **역방향 호출 메커니즘**입니다.

#### Sampling 작동 방식

MCP의 흐름은 보통 LLM → 서버 방향이지만, Sampling은 서버 → LLM 방향의 요청을 가능하게 합니다. MCP 서버가 복잡한 작업을 수행하는 도중에 LLM의 판단이 필요할 때, 클라이언트를 통해 LLM에게 완성 요청을 보낼 수 있습니다.

예를 들어, MCP 서버가 대량의 데이터를 분석하는 중간에 "이 데이터에서 이상 패턴이 발견되었는데, 어떻게 해석해야 할까?"와 같은 질문을 LLM에게 보내고, 그 응답을 바탕으로 다음 단계를 결정할 수 있습니다.

이때, 사용자의 프라이버시와 보안을 위해 호스트(클라이언트)가 Sampling 요청을 중간에서 검토하고, 필요시 사용자에게 승인을 요청할 수 있습니다.

**프로토콜 작업:**

| Method                   | 목적                            | Return            |
| ------------------------ | ------------------------------- | ----------------- |
| `sampling/createMessage` | 서버가 LLM에게 완성 요청을 보냄 | LLM의 응답 메시지 |

### Roots

Roots는 클라이언트가 서버에게 자신이 관심 있는 파일 시스템 경로나 URI를 알려주는 기능입니다.

#### Roots 작동 방식

클라이언트가 서버에 연결할 때, 작업 범위를 나타내는 루트 URI 목록을 제공합니다. 예를 들어, `file:///home/user/projects/my-app`이라는 루트를 제공하면, 서버는 해당 디렉토리 범위 내에서 작업을 수행해야 함을 이해합니다.

Roots는 강제적인 보안 경계가 아닌 안내 역할을 합니다. 서버가 작업 범위를 적절히 판단할 수 있도록 도와주며, 클라이언트는 세션 중에 루트가 변경되면 서버에 알림을 보낼 수 있습니다.

**프로토콜 작업:**

| Method                             | 목적                        | Return        |
| ---------------------------------- | --------------------------- | ------------- |
| `roots/list`                       | 클라이언트의 루트 목록 요청 | 루트 URI 배열 |
| `notifications/roots/list_changed` | 루트 변경 시 서버에 알림    | 알림 확인     |

## 예시

이해를 위해 Claude를 통해 예시를 생성해보았다.

1. 서버 등록 (claude_desktop_config.json) : MCP 서버 자체를 클라이언트에 연결한다.

```json
{
    "mcpServers": {
        "travel": {
            "command": "python",
            "args": [
                "travel_server.py"
            ]
        }
    }
}
```

2. 서버 코드 내부 : 여기서 셋 다 정의

```python
# Tool
# LLM이 실제 API를 자율적으로 호출
@mcp.tool() 
async def search_flights(origin: str, dest: str, date: str): 
    """항공편을 검색합니다"""
    return await airline_api.search(origin, dest, date) 

@mcp.tool() 
async def send_email(to: str, subject: str, body: str): 
    """이메일을 발송합니다""" 
    return await smtp.send(to, subject, body)
```



```python
# Resources
# 앱이 관리 → 읽기 전용 데이터 반환 
@mcp.resource("travel://history/{trip_id}") 
async def get_trip_history(trip_id: str): 
    """과거 여행 기록을 조회합니다""" 
    return db.query(f"SELECT * FROM trips WHERE id={trip_id}") 

@mcp.resource("travel://preferences") 
async def get_preferences(): 
    """사용자 여행 선호도를 반환합니다""" 
    return user_prefs.load()
```



```python
# Prompt 
# 사용자가 /plan-vacation 으로 명시적 호출 
@mcp.prompt() 
async def plan_vacation(destination: str, days: int, budget: int): 
    """휴가 계획 워크플로""" 
    return [ 
      UserMessage(f"{destination}으로 {days}일, 예산 ${budget}로 여행 계획해줘. 기존 선호도와 캘린더를 확인하고, 항공편 검색 후 호텔을 예약해줘.") 
    ]
```



```python
# Sampling
# 서버 → LLM 역방향 호출. 서버가 작업 중간에 LLM의 판단이 필요할 때 사용
@mcp.tool()
async def analyze_trip_reviews(destination: str):
    """여행지 리뷰를 분석하고 요약합니다"""
    # 1. 외부 API에서 대량의 리뷰 데이터를 가져옴
    reviews = await review_api.fetch_all(destination)
    
    # 2. 리뷰가 너무 많거나 복잡할 때, LLM에게 분석을 요청 (Sampling)
    #    서버가 직접 판단하기 어려운 부분을 LLM에게 위임
    analysis = await mcp.sampling.create_message(
        messages=[
            {
                "role": "user",
                "content": f"다음 {len(reviews)}개의 리뷰를 분석해서 "
                           f"주요 장점, 단점, 주의사항을 정리해줘:\n\n"
                           f"{format_reviews(reviews)}"
            }
        ],
        max_tokens=1000
    )
    
    # 3. LLM의 분석 결과를 바탕으로 최종 추천 생성
    return {
        "destination": destination,
        "review_count": len(reviews),
        "analysis": analysis.content,
        "average_rating": calculate_avg(reviews)
    }
```



```python
# Roots
# 클라이언트가 서버에게 작업 범위를 알려줌
# 서버 초기화 시 클라이언트로부터 roots를 수신

server = Server("travel-server")

@server.roots_list_changed()
async def on_roots_changed():
    """클라이언트의 루트가 변경되었을 때 호출됩니다"""
    # 클라이언트로부터 현재 루트 목록을 가져옴
    roots = await server.list_roots()
    
    # 예시: roots = [
    #   Root(uri="file:///home/user/travel-data", name="여행 데이터"),
    #   Root(uri="file:///home/user/documents/itineraries", name="여행 일정")
    # ]
    
    for root in roots:
        print(f"작업 범위: {root.uri} ({root.name})")
    
    # 루트 범위 내의 파일만 접근하도록 서버 설정 업데이트
    await update_allowed_paths(roots)
```



## 참고 문헌

- https://modelcontextprotocol.io/docs/getting-started/intro
- https://modelcontextprotocol.io/docs/concepts/architecture
- https://modelcontextprotocol.io/docs/concepts/sampling
- https://modelcontextprotocol.io/docs/concepts/roots
- https://modelcontextprotocol.io/docs/concepts/transports
- https://cloud.google.com/discover/what-is-model-context-protocol?hl=ko