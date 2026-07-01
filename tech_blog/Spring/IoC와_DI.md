---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - spring
  - ioc
  - di
  - dependency-injection
---

# IoC와 DI

## IoC와 DI

>  DI(Dependency Injection)와 IoC(Inversion of Control)는 컴포넌트의 의존성을 제어, 즉 제어흐름과 의존성 주입을 프레임워크가 대신 책임진다는 뜻



## IoC(제어의 역전)

> *Don't call us, we'll call you*

### 정의

IoC(Inversion of Control), 즉 제어의 역전을 뜻한다. 

개발자가 직접 개체를 생성하거나 라이프 사이클을 관리하는게 아니라, 외부 즉 프레임워크가 객체 생성, 실행 흐름, 이벤트 호출 등을 관리하는 구조를 말한다.

*"Don't call us. We'll call you."*는 제어에 역전에 대해 알려주는 비유적인 표현으로, 원래는 오디션에 떨어진 배우들에게 영화사가 하던 말이 프로그래밍 용어로 인용되고 있다. 즉, 배우들에게 영화사가 필요하면 연락할 테니 먼저 연락하지 말라는 뜻이다.

요컨데, 객체들을 만들고 나서, 해당 객체를 조립하고 호출하는 것이 프로그래머가 아니라 프레임워크에서 한다는 말이다.

### 예시

Spring 컨테이너가 Bean을 생성하고 @Controller, @Service 등을 호출하는 구조 .

```java
@RestController
@RequestMapping("/v1/test")
public class TestController {
    private TestService service;

    @Autowired
    public TestController(TestService service) {
        this.service = service;
    }
  
    @Operation(summary = "테스트")
    @GetMapping("/")
    public void testMethod() {
        service.testPrint()
    }
}
```

```java
@Service
public class TestService {
    private TestRepository repository;

    @Autowired
    public TestService(TestRepository repository) {
        this.repository = repository;
    }
  
    public void testPrint() {
        print("I'm Test!!!!")
    }
}
```

이런 구조에서 프로그래머는 `TestController`를 생성할 때 매개변수인 `TestService service`를 직접 설정하지도 않고, `TestService`를 생성할때 매개변수인 `TestRepository repository`를 입력하지도 않는다.



그렇지만, 호출을 하지 않아도 `service`는 정상적으로 할당되고, 심지어 정상적으로 호출되고, 끝난 후에 알아서 소멸시킨다.

심지어 `Controller`의 `testMethod`의 호출 부분도 프로그래머가 지정하지 않는다.



즉, 프로그래머는 객체를 생성하기만 하고 조립등의 제어권은 프레임워크한테 역전되는 것을 말한다.



## DI(의존성 주입)

### 정의

객체가 필요로하는 의존성을 스스로 new 하지 않고, 프레임워크가 생성해서 주입하는 것을 말한다. 그럼 IoC와 무엇이 다른가 싶으면 DI는 IoC의 구현 방식중 하나로, 의존성을 명시적으로 외부에서 주입하는 패턴을 말한다.

즉, **DI ⊂ IoC** 이다. DI는 IoC의 구현 방식 중 하나로써, **IoC는 설계 원칙**이고 **DI는 디자인 패턴**이다.

SOLID 원칙의 DIP와 상호 보완적인 개념이므로 같이 보면 좋다.



### 예시

서로간의 의존성이 줄어든다

```java
public static void main(String[] args) {
    Service service = new Service();
    Controller controller = new Controller(service);
}
```

```java
public class Controller {
    private Service service = new Service();
}
```

```java
private class Service {
    //Todo
}
```

이렇게 서로간의 의존 관계를 맺었을 때, `Controller`는  `Service`를 인스턴스로 가진다. 이때, Controller에 만약 해당 서비스를 다른 서비스로 교체가 필요하게 된 경우는 어떻게 처리해야 할까?

```java
interface IService { }

private class Service implements IService{
    // TODO
}

private class MockService implements IService{
    // TODO
}
```

즉, 컨트롤러의 Service로 Mock으로 교체해서 태스트 해야할 때, Controller의 Service를 교체하는 것도 상당히 대공사로 바뀌게 된다.

즉, Service 부분만 바꾸게 되었는데 Controller도 같이 수정을 해야하는 현상이 생기게 된다.

이럴때 필요한게 DI고 생성자 주입을 의미한다.



그럼 컨트롤러를 DI 디자인 패턴대로 바꿔보자

```Java
public class Controller {
    private Service service;
  
    public Controller(Service service) {
        this.service = service
    }
}
```

```java
public static void main(String[] args) {
  	// 진짜 실행을 위한 서비스
    Service service = new Service();
    Controller controller = new Controller(service);
  
    // Mock Test를 위한 서비스
    MockService mockService = new MockService()
    Controller testController = new Controller(mockService)
}
```

이렇게 바꾸면 Contoller의 단은 바꿀 필요 없이, 단순히 Controller 호출 부분만 바꿈으로써 더 많은 코드 수정을 줄임으로써 이슈를 줄일 수 있다.



### 다른 예제들

- Setter Injection

```java
// https://www.javaguides.net/2023/01/spring-boot-setter-injection-example.html 
@Component
public class MessageSender {
    private MessageService service;

    @Autowired
    public void setMessageService(@Qualifier("emailService") MessageService service) {
        this.service = service;
        System.out.println("setter based dependency injection");
    }

    public void send(String msg) {
        service.sendMessage(msg);
    }
}
```

Spring에서 가장 흔히 쓰이는 주입 방식으로, 빈 생성 후 setter 메서드를 통해 의존성을 주입한다.



- Method Injection

```java
public class Client {
  public void execute(Service service) {
    service.execute();
  }
}
```

메서드 호출 시점에 의존성을 전달하는 방식으로, 임시 의존성이나 부분적인 기능 수행 시 사용된다.

즉, 실행 단계에만 필요한 의존성을 주입하는 예시이다.



## 참고 문헌

- [https://velog.io/@lee9040s/IoC와-DI](https://velog.io/@lee9040s/IoC와-DI)
- [https://jobc.tistory.com/30](https://jobc.tistory.com/30)
- [https://velog.io/@minnseong/IoC와-DI](https://velog.io/@minnseong/IoC와-DI)
- [https://velog.io/@ohzzi/Spring-DIIoC-IoC-DI-그게-뭔데](https://velog.io/@ohzzi/Spring-DIIoC-IoC-DI-그게-뭔데)
- [https://en.wikipedia.org/wiki/Dependency_injection](https://en.wikipedia.org/wiki/Dependency_injection)
- [https://www.javaguides.net/2023/01/spring-boot-setter-injection-example.html ](https://www.javaguides.net/2023/01/spring-boot-setter-injection-example.html )