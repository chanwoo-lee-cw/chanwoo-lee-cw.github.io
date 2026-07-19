---
created_at: 2026-07-19
updated_at: 2026-07-19
tags:
  - kotlin
  - coroutine
  - concurrency
---

# Coroutine

## 코루틴이란?

> 함수처럼 호출되지만 중간에 실행을 멈추고(suspend), 나중에 중단했던 지점부터 다시 실행(resume)할 수 있는 '협력적인 루틴'

스레드(Thread)와 달리 경량이며, 비동기 작업을 처리할 때 코드를 순차적인 코드처럼 작성하게 만들어 가독성을 높이고, 스레드 오버헤드 없이 효율적인 동시성을 구현하는 데 사용된다.



## 코루틴과 쓰레드

프로세스 :  컴퓨터에서 실행되고 있는 프로그램을 의미한다.

쓰레드 : 프로세스보다 작은 개념으로 프로세스에 소속되어 여러 코드를 동시에 실행할 수 있도록 해준다.

즉, 한 프로세스가 여러 개의 쓰레드를 가지고 있으면 멀티 쓰레드 환경이라고 한다.

코루틴 : 쓰레드보다 작은 개념이다. 코루틴은 중단되었다가 재개될 수 있기 때문에, 앞부분은 1번 쓰레드에 배전되고, 뒷 부분은 2번 쓰레드에 배정될 수 있다.



### Context Switching

- 프로세스
  - 프로세스는 각각의 독립된 메모리 영역을 가지고 있기 때문에, Context Switching시 힙과 스택 영역이 모두 교체되어야 한다.
  - 가장 무거운 Context Switching 
- 스레드
  - 프로세스내에 스택 영역을 갖고 있지만, 힙 영역을 공유하고 있기 때문에 실행이 변경되면 스택 영역만 교체된다.
  - 프로세스보단 가벼운 Context Switching
- 코루틴
  - 두 코루틴이 같은 쓰레드 위에서 실행될 수 있다.
  - 동일한 쓰레드에서 코루틴이 실행되면, 메모리를 공유하므로 Context Switching이 적다.
  - 여러 개의 코루틴이 한개의 스레드 위에서 번갈아 실행될 수 있기 때문에, 적은 쓰레드로도 동시성을 확보할 수 있다.
  - 쓰레드와는 다르게 코루틴 작업 흐름이 쓰레드에 종속되어있지 않는다.



## 코루틴의 핵심 특징

- 비동기 코드를 동기 구조처럼 작성한다.
  - 일반 함수처럼 작성하지만, 중단 및 재실행이 가능하므로 비동기 환경에서도 직관적인 코드 흐름 유지가 가능하다.
- 스레드를 블로킹하지 않는다.
  - `delay()` 같은 중단 포인트도 스레드를 차단하지 않고, 다른 코루틴을 실행한다.
- 경량성
  - 스레드 대신 코루틴 오브젝트 단위로 스케쥴링해 비용이 적다.



## **코루틴** **빌더와** Job

### runBlocking

`runBlocking` 함수는 새로운 코루틴을 만들고 루틴과 코루틴을 이어주는 역할을 한다. 이렇게 코루틴을 만드는 함수를 **코루틴 빌더**라고 한다.

단, `blocking`이라는 이름대로 해당 코루틴이 완료될 때까지 스레드를 블락시킨다. 

```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine() : Unit = runBlocking {
    printWithThread("START")
    launch {
        delay(2_000L)	// End가 출력되기까지 2초를 기다리는 동안 쓰레드가 블락된다.
        printWithThread("LAUNCH END")
    }
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] START
[main @coroutine#2] LAUNCH END
[main] END
```



### Job

`launch`는 `runBlocking`와 다르게 만들어진 코루틴을 결과로 반환하고, 이 객체를 이용해 코루틴을 제어할 수 있다.

```kotlin
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine(): Unit = runBlocking {
    printWithThread("START")
  	// launch라는 코루틴 빌더를 변수로 할당한다.
    val job = launch(start = CoroutineStart.LAZY) {
        printWithThread("Hello launch")
    }
    delay(2_000L)
    job.start()
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] START
[main @coroutine#2] Hello launch
[main] END
```

`launch`를 코루틴 빌더로 사용할 때, `CoroutineStart.LAZY` 옵션을 주어서 코루틴을 지연 시작으로 변경하고,  `job.start()`를 직접 호출해서 직접 시작한다.



### cancel

현재 돌아가고 있는 코루틴을 취소한다.

```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine(): Unit = runBlocking {
    val job = launch {
        (1..5).forEach {
            printWithThread(it)
            delay(500)
        }
    }
    delay(1_000L)
    job.cancel()
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#2] 1
[main @coroutine#2] 2
[main] END
```



### Join

제어하고 있는 코루틴이 끝날 때까지 대기한다.

Join을 사용하지 않는 예시에 대해 작성한다.

```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine(): Unit = runBlocking {
    val job1 = launch {
        printWithThread("Job 1 : START")
        delay(1_000)
        printWithThread("Job 1 : END")
    }
    val job2 = launch {
        printWithThread("Job 2 : START")
        delay(1_000)
        printWithThread("Job 2 : END")
    }
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#2] Job 1 : START
[main @coroutine#3] Job 2 : START
[main @coroutine#2] Job 1 : END
[main @coroutine#3] Job 2 : END
[main] END
```

![join 미사용](https://velog.velcdn.com/images/alphanewbie/post/453cc353-ba60-4361-bd03-ebb9ac71ccbf/image.png)

각각 코루틴에 딜레이가 걸려 있지만, Job1과 Job2가 함께 출력되는데, Job1에서 1초를 대기하는 동안 Job2를 처리하기 때문이다.



```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine(): Unit = runBlocking {
    val job1 = launch {
        printWithThread("Job 1 : START")
        delay(1_000)
        printWithThread("Job 1 : END")
    }

  	// job1이 끝날 때까지 기다린다.
    job1.join()
    
    val job2 = launch {
        printWithThread("Job 2 : START")
        delay(1_000)
        printWithThread("Job 2 : END")
    }
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#2] Job 1 : START
[main @coroutine#2] Job 1 : END
[main @coroutine#3] Job 2 : START
[main @coroutine#3] Job 2 : END
[main] END
```



![join 사용](https://velog.velcdn.com/images/alphanewbie/post/238ae9c0-2b1a-468d-96ca-653ddfeef7a8/image.png)

join을 호출함으로써, job1이 끝날 때까지 기다리기 때문에 Job1과 Job2가 순차적으로 실행된다.



### async

```kotlin
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlin.system.measureTimeMillis


suspend fun echoValue(value: Int): Int {
    // 계산 시간 가정을 위한 1초
    delay(1_000)
    return value
}

fun testCoroutine(): Unit = runBlocking {
    val time = measureTimeMillis {
        val job1 = async { echoValue(1) }
        val job2 = async { echoValue(2) }
        printWithThread(job1.await() + job2.await())
    }
    printWithThread("소요 시간 : $time ms")
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] 3
[main @coroutine#1] 소요 시간 : 1044 ms
[main] END
```

`async()`는 `launch()`와 동일하게 코루틴을 실행하는 함수지만, 결과값을 리턴한다는 것이 다르다.

`suspend`를 붙인 함수를 호출함으로써 여러 외부 자원을 동시에 호출해야하는 경우에서 지연 시간을 최대한으로 줄일 수 있다.



단, 주의 사항은 `CoroutineStart.LAZY`를 사용하는 경우 계산 결과를 기다리기 때문에 코루틴으로 얻을 수 있는 장점이 줄어들게 된다.

```kotlin
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlin.system.measureTimeMillis


suspend fun echoValue(value: Int): Int {
    // 계산 시간 가정을 위한 1초
    delay(1_000)
    return value
}

fun testCoroutine(): Unit = runBlocking {
    val time = measureTimeMillis {
        val job1 = async(start = CoroutineStart.LAZY) { echoValue(1) }
        val job2 = async(start = CoroutineStart.LAZY) { echoValue(2) }
        // 지연 된 작업을 실행시킨다.
        job1.start()
        job2.start()
        printWithThread(job1.await() + job2.await())
    }
    printWithThread("소요 시간 : $time ms")
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] 3
[main @coroutine#1] 소요 시간 : 1085 ms
[main] END
```

즉, `start()`를 통해 함수를 먼저 시작해줘야, 코루틴으로써 동시에 사용할 수 있다.



## 코루틴의 취소

```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking


fun testCoroutine(): Unit = runBlocking {
    val job1 = launch {
        delay(1_000L)
        printWithThread("This is Job1")
    }
    val job2 = launch {
        delay(1_000L)
        printWithThread("This is Job2")
    }
    delay(100L)
    job1.cancel()
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#3] This is Job2
[main] END
```

코루틴은 취소할 수 있지만, `Job`객체의 `cancel()` 함수를 이용해 취소 가능하지만,

취소 대상인 코루틴도 `delay()` 함수나 `yield()`와 같은 **suspend 함수**를 사용해 대기 상태여야 취소가 가능하다. 



```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking


fun testCoroutine(): Unit = runBlocking {
    val job = launch {
        var i = 1
        var nextPrintTime = System.currentTimeMillis()
        while (i <= 5) {
            if (nextPrintTime <= System.currentTimeMillis()) {
                printWithThread("This is Job1 : print $i")
                nextPrintTime += 100L // 1초 후에 다시 출력되도록 한다.
                i++
            }
        }
    }
    delay(300L)
    job.cancel()
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#2] This is Job1 : print 1
[main @coroutine#2] This is Job1 : print 2
[main @coroutine#2] This is Job1 : print 3
[main @coroutine#2] This is Job1 : print 4
[main @coroutine#2] This is Job1 : print 5
[main] END
```

예상대로라면 3까지 출력되고 끝내야 했지만, 5까지 정상 출력되는 것을 볼 수가 있다.

즉, busy Waiting을 이용한 방식의 대기인 경우에는 중단이 되지 않는다.



### 멀티 쓰레드 코루틴 취소

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlin.coroutines.cancellation.CancellationException


fun testCoroutine(): Unit = runBlocking {
    val job = launch(Dispatchers.Default) {
        var i = 1
        var nextPrintTime = System.currentTimeMillis()
        while (i <= 5) {
            if (nextPrintTime <= System.currentTimeMillis()) {
                printWithThread("${i++} 번째 출력!")
                nextPrintTime += 100L // 1초 후에 다시 출력되도록 한다.
            }
            if (!isActive) {
                throw CancellationException()
            }
        }
    }
    delay(100L)
    printWithThread("취소 시작")
    job.cancel()
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[DefaultDispatcher-worker-2 @coroutine#2] 1 번째 출력!
[DefaultDispatcher-worker-2 @coroutine#2] 2 번째 출력!
[main @coroutine#1] 취소 시작
[main] END
```

코루틴의 취소 시키는 방법은 코루틴 스스로 본인의 상태를 확인해 취소 요청을 받았을때 `CancellationException`를 던지는 방법이 있다.

- `Dispatchers.Default`
  - 코루틴을 다른 쓰레드에서 동작하도록 할당한다는 뜻이다.
- `isActive`
  - 코루틴 블록 안에서 `isActive`라는 프로퍼티를 통해 해당 코루틴이 활성화되어 있는지 확인 할 수 있다.
  - 취소 신호를 전달하기 위해서 다른 쓰레드에서 동작하고 있어야 한다.



## 코루틴의 예외 처리

코루틴 내부에서 발생한 예외의 처리 방법

- 발생한 예외가 `CancellationException`인 경우
  - 취소로 간주하고 부모 코루틴에게 전파하지 않는다.
- 다른 예외가 발생한 경우
  - 실패로 간주하고 부모 코루틴에게 전파한다.

### 예외가 발생한 경우 코루틴의 흐름
![](https://velog.velcdn.com/images/alphanewbie/post/58956352-c9f8-49a3-b911-ac8176fd6485/image.png)

### 정상 흐름의 경우 코루틴의 흐름
![](https://velog.velcdn.com/images/alphanewbie/post/674a3521-2cf9-42a4-8f6f-cf28f64827cc/image.png)

### launch

```kotlin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine() : Unit = runBlocking {
    printWithThread("START")
    val job = CoroutineScope(Dispatchers.Default).launch {
        throw IllegalArgumentException()
        printWithThread("This is Coroutine1")
    }
    delay(1_000L)
    printWithThread(job)
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] START
[main @coroutine#1] "coroutine#2":StandaloneCoroutine{Cancelled}@64c7c9b8
[main] END

BUILD SUCCESSFUL in 3s
3 actionable tasks: 2 executed, 1 up-to-date
Exception in thread "DefaultDispatcher-worker-1 @coroutine#2" java.lang.IllegalArgumentException
	at MainKt$testCoroutine$1$job$1.invokeSuspend(Main.kt:10)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
```

`launch` 함수는 자식 코루틴에서의 예외의 발생과 관계없이 부모 코루틴은 정상적으로 종료되는걸 알 수 있다.



```kotlin
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine(): Unit = runBlocking {
    printWithThread("START")

    val exceptionHandler = CoroutineExceptionHandler { context, throwable ->
        printWithThread("$throwable 예외")
    }
    val job = CoroutineScope(Dispatchers.Default).launch(exceptionHandler) {
        throw IllegalArgumentException()
        printWithThread("This is Coroutine1")
    }
    delay(1_000L)
    printWithThread(job)
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] START
[DefaultDispatcher-worker-1 @coroutine#2] java.lang.IllegalArgumentException 예외
[main @coroutine#1] "coroutine#2":StandaloneCoroutine{Cancelled}@6895a785
[main] END
```

-  `CoroutineExceptionHandler` 
  - 코루틴에서 예외 발생시, 직접 `try catch` 대신, 예외가 발생한 경우 처리하는 공통된 로직을 만들고 싶은 경우에 사용한다.

```kotlin
@Suppress("FunctionName")
public inline fun CoroutineExceptionHandler(crossinline handler: (CoroutineContext, Throwable) -> Unit): CoroutineExceptionHandler =
    object : AbstractCoroutineContextElement(CoroutineExceptionHandler), CoroutineExceptionHandler {
        override fun handleException(context: CoroutineContext, exception: Throwable) =
            handler.invoke(context, exception)
    }
```

- `CoroutineContext` : 코루틴 구성 요소의 context 정보를 담고 있는 객체
- `Throwable` : 발생한 예외의 정보



### async

```kotlin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking

fun testCoroutine() : Unit = runBlocking {
    printWithThread("START")
    val job = CoroutineScope(Dispatchers.Default).async {
        throw IllegalArgumentException()
        printWithThread("This is Coroutine1")
    }
    delay(1_000L)
    printWithThread(job)
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] START
[main @coroutine#1] "coroutine#2":DeferredCoroutine{Cancelled}@d44fc21
[main] END
```



하지만, async 함수에서는 예외가 발생하지만, 해당 예외에 대해 처리하지 않는다.

이는 값을 반환하는 코루틴에 사용되기 때문에 예외 역시 반환 할 때 처리 할 수 있도록 설계된 것이다.



```kotlin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking

fun testCoroutine() : Unit = runBlocking {
    printWithThread("START")
    val job = CoroutineScope(Dispatchers.Default).async {
        throw IllegalArgumentException()
        printWithThread("This is Coroutine1")
    }
    delay(1_000L)
    job.await()     // 이때 예외가 발생한다.
    printWithThread(job)
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] START
3 actionable tasks: 2 executed, 1 up-to-date
Exception in thread "main" java.lang.IllegalArgumentException
	at MainKt$testCoroutine$1$job$1.invokeSuspend(Main.kt:10)
	at _COROUTINE._BOUNDARY._(CoroutineDebugging.kt:46)
	at MainKt$testCoroutine$1.invokeSuspend(Main.kt:14)
Caused by: java.lang.IllegalArgumentException
	at MainKt$testCoroutine$1$job$1.invokeSuspend(Main.kt:10)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
```

`async` 함수에서 발생한 예외를 확인하고 싶다면 `job.await()` 함수를 사용해야한다.

하지만 예외가 발생하는 경우, 부모 코루틴으로 전파되어 부모 코루틴도 함께 함께 종료되게 된다.



# Coroutine의 구성 요소와 원리

## Structued Concurrency

```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine(): Unit = runBlocking {
    printWithThread("START")
    val job1 = launch {
        delay(600L)
        printWithThread("job1 성공!")
    }
    val job2 = launch {
        delay(500L)
        throw IllegalArgumentException("job2 예외 Throw")
    }
    printWithThread("END")
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
[main @coroutine#1] START
[main @coroutine#1] END
Exception in thread "main" java.lang.IllegalArgumentException: job2 예외 Throw
	at MainKt$testCoroutine$1$job2$1.invokeSuspend(Main.kt:16)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
```

Job2에서만 에러가 발생했고, Job1에서는 에러가 발생하지 않았지만, Job2, Job2 모두 에러가 취소된걸 알 수가 있다.

즉, 자식 코루틴에서 에러가 발생한 경우, 다른 코루틴도 같이 취소된다.

![](https://velog.velcdn.com/images/alphanewbie/post/674a3521-2cf9-42a4-8f6f-cf28f64827cc/image.png)

그를 위해서 코루틴은 취소나 성공 시에 상태를 바로 `Completed`나 `Cancelled` 상태로 바꾸지 않고 중간 단계를 거쳐서 취소한다.

<img src="https://velog.velcdn.com/images/alphanewbie/post/c81ba4e3-f89d-4fb8-8d94-c79769c76cc7/image.png" alt="대체 텍스트" width="50%" height="50%">

이런 식으로 부모-자식 관계의 코루틴이 한몸처럼 움직이는 것을 `Structued Concurrency`라고 한다.

### Structued Concurrency

- `Structued Concurrency`는 수많은 코루틴이 유실되거나 누수되지 않도록 보장한다.
- `Structued Concurrency`는 코드 내의 에러가 유실되지 않고 보고될 수 있도록 보장한다.

요컨데,

- 자식 코루틴에서 예외가 발생할 경우, `Structued Concurrency`에 의해 부모 코루틴이 취소되고, 다른 자식 코루틴도 취소된다.
- 자식 코루틴에서 예외가 발생하지 않더라도 부모 코루틴이 취소되면, 자식 코루틴들이 취소된다.
- `CancellationException`인 경우 정상적인 취소이기 때문에 부모 코루틴에게 전달되지 않고, 다른 자식 코루틴을 취소 시키지 않는다.



## CoroutineScope**과** CoroutineContext

### CoroutineScope

```kotlin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun testCoroutine() : Unit = runBlocking {
    printWithThread("START")
    val job = CoroutineScope(Dispatchers.Default).launch {
        throw IllegalArgumentException()
        printWithThread("This is Coroutine1")
    }
    delay(1_000L)
    printWithThread(job)
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

> 코루틴의 정보를 묶어서 관리하는 코루틴 컨테이너
>
> 수명/취소/예외 전파 규칙 등의 CoroutineContext 데이터를 보관한다.

즉,  CoroutineScope의 역할

1. 코루틴의 실행 범위를 정해주는 코루틴 컨테이너

   - `launch`와 `async` 같은 코루틴 빌더로 생성되는 코루틴의 부모 역할
   - `CoroutineScope`이 살아 있으면 하위 코루틴도 같이 살아있고, 에러 발생하면 같이 죽는다.

2. `CoroutineContext`의 데이터를 보관한다

1. `Structured Concurrency` 을 가능하게 한다.
   - 이 범위 안에서 생성된 코루틴은 이 범위 안에서만 시작하고 끝내는 규칙을 만들어준다.
   - 코루틴이 유실되지 않도록 한다.
   - 코루틴의 예외가 유실되지 않도록 한다.

자주 쓰이는 CoroutineScope

-  `runBlocking`
  - 현재의 스레드를 Block 시키고 코루틴을 실행한다.
  - 주로 테스트와 main에서만 사용한다.
- `coroutineScope`
  - 블록 안에서 시작한 자식 코루틴이 다 끝날 때까지 반환하지 않는다.
- `supervisorScope`
  - 각각의 자식 코루틴을 독립적으로 실행한다. -> 하나의 코루틴이 실패해도 전체가 취소되지 않는다.
- `CoroutineScope(Dispatchers.Default + Job())`
  - 수동으로 cancel 해줘야 누수/백그라운드 작업 지속을 막을 수 있다.

### CoroutineContext

<img src="https://velog.velcdn.com/images/alphanewbie/post/98d74e71-a3d8-46be-8c32-2b4effaa5e6d/image.png" alt="대체 텍스트" width="70%" height="70%">

> 코루틴이 실행될 때 환경과 설정을 저장하는 키-값 Map
>  코루틴이 **어디서(Dispatcher), 누구 밑에서(Job), 어떤 이름으로(Name), 어떤 추가정보로(ThreadLocal/CoroutineExceptionHandler 등)** 실행될지를 저장한다.

`CoroutineContext`에는 코루틴의 이름, `Dispatcher.Default`, 부모 코루틴이 들어있다.

자식 코루틴은 부모 코루틴과 같은 영역에 생성되고, 생성될 때 부모 코루틴의 context를 가져온 다음 필요한 정보를 덮어씌워서 새로운 context를 작성한다.

이렇게 구성함으로써 코루틴 영역 자체를 cancel() 시킴으로써 모든 코루틴을 종료 시킬 수 있다.

```kotlin
import kotlinx.coroutines.*
import java.lang.Thread.sleep

class AsyncLogic {
    private val scope = CoroutineScope(Dispatchers.Default)
    fun launch() = scope.launch {
        delay(2_000L)
        printWithThread("LAUNCH END")
    }

    fun destroy() {
        scope.cancel()
    }
}

fun main() {
    val logic = AsyncLogic()
    logic.launch()
    sleep(3_000L)
    logic.destroy()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```kotlin
import kotlinx.coroutines.*
import java.io.Closeable

class AsyncLogic(
    dispatcher: CoroutineDispatcher = Dispatchers.Default
) : Closeable {
    private val job = SupervisorJob()
    private val scope = CoroutineScope(dispatcher + job)

    fun launch(): Job = scope.launch {
        delay(2_000L)
        printWithThread("LAUNCH END")
    }

    override fun close() {
        job.cancel()
    }

    suspend fun closeAndJoin() {
        job.cancelAndJoin()
    }
}

fun main() = runBlocking {
    AsyncLogic().use { logic ->
        logic.launch()
        delay(3_000L)
    }
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```



`Dispatcher`란 코루틴은 중단 되었다가 다른 스레드에 배정될 수도 있는데, 이렇게 코루틴을 스레드에 배정하는 역할을 `Dispatcher`가 수행하고, context에 저장된다.

**Dispatcher**의 대표적인 종류

- `Dispatchers.Default`
  - Default 디스패처
  - CPU 자원을 많이 쓸 때 권장된다.
- `Dispatchers.IO`
  - I/O 작업에 최적화된 디스패쳐
- `Dispatchers.Main`
  - 보통 UI 컴포넌트를 조작하기 위한 디스패쳐
  - 특정 의존성을 갖고 있어야 정상적으로 활용할 수 있다.
- `asCoroutineDispatcher`
  - Java의 스레드풀인 ExecutorService를 디스패처로 전환해서 사용한다.



## suspending function

> `suspend` 지시어가 붙은 함수
>
> 코루틴을 잠시 멈췄다가 나중에 이어서 할 수 있는 함수를 의미한다.

`suspend` 지시어가 붙으면 다른 `suspend` 함수를 부를 수 있게 된다. 즉, 호출해도 되고 호출을 하지 않아도 된다.

또한, 스레드가 아니라 코루틴을 멈춘다.

```kotlin
suspend fun echoValue(value: Int): Int {
    // 계산 시간 가정을 위한 1초
    delay(1_000)
    return value
}
```

이런 식으로 함수 앞에 `suspend` 지시어를 붙힘으로 `suspend` 함수를 부를 수 있다.

```kotlin
fun testCoroutine(): Unit = runBlocking {
    printWithThread("START")
  	// launch라는 코루틴 빌더를 변수로 할당한다.
    val job = launch(start = CoroutineStart.LAZY) {
        printWithThread("Hello launch")
    }
    delay(2_000L)
    job.start()
}
```

`runBlocking` 코루틴 빌더나 `launch` 빌더 같은 코루틴 빌더들은 `suspend` 함수가 내장되어 있어서 suspend 를 붙인 것을  suspending lambda 라고 부른다.

### suspending function의 의미

1. 중단 지점(suspension point)을 가질 수 있다.

   - `suspend fun` 안에서는 `delay()`, `await()`, `withContext()` 같은 중단 가능 함수를 호출할 수 있다.

2. `suspend fun`은 코루틴 내부에서만 호출 가능 하다

   - `suspend fun` 다른 `suspend fun`  안 혹은, `launch {}`, `async {}`, `runBlocking {}` 같은 코루틴 빌더 내부에서만 호출 가능하다.

3. 쓰레드 Block과는 다르다.

   - ```kotlin
     import kotlinx.coroutines.*
     
     fun blocking() {
         Thread.sleep(1000) // 스레드가 1초 동안 멈춤
     }
     
     suspend fun suspending() {
         delay(1000)        // 코루틴만 멈춤 (스레드는 다른 코루틴 실행 가능)
     }
     ```



### suspend 함수

1. `coroutineScope`

`coroutineScope`함수는 `launch` 나 `async` 처럼 새로운 코루틴을 만들지만, 주어진 코드 블록이 실행된다. 새로 생긴 코루틴과 자식 코루틴들이 모두 완료된 이후 반환된다. coroutineScope 으로 만든 코루틴은 이전 코루틴의 자식 코루틴이 된다.

2. `withContext`

`coroutineScope`과 동일하게 코드 블록이 즉시 호출되어 새로운 코루틴이 만들어지고, 이 코루틴이 완전히 종료되어야 반환된다.

하지만 `withContext`은 `context`를 변경할 수 있다. 

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlin.system.measureTimeMillis


suspend fun calculateResult(): Int = withContext(Dispatchers.Default) {
    printWithThread("START")
    val num1 = async {
        delay(1_000L)
        10
    }
    val num2 = async {
        delay(1_000L)
        20
    }
    num1.await() + num2.await()
}

fun testCoroutine(): Unit = runBlocking {
    val time = measureTimeMillis {
        printWithThread(calculateResult())
    }
    printWithThread("소요 시간 : $time ms")
}

fun main() {
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

3. `withTimeout` 와 `withTimeoutOrNull`

`coroutineScope`과 유사하지만 해당 코드 블록이 시간 내에 완료되지 않으면 `TimeoutCancellationException` 를 발생 시킨다. 또한,  `withTimeoutOrNull`은 null을 반환한다.

```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout


fun testCoroutine(): Unit = runBlocking {
    val num = withTimeout(1_000L) {
        delay(1_500L)
        10 + 20
    }
    printWithThread(num)
}

fun main() {
    printWithThread("START")
    testCoroutine()
    printWithThread("END")
}

fun printWithThread(str: Any?) {
    println("[${Thread.currentThread().name}] $str")
}
```

```
> Task :MainKt.main() FAILED
[main] START
Exception in thread "main" kotlinx.coroutines.TimeoutCancellationException: Timed out waiting for 1000 ms
	at _COROUTINE._BOUNDARY._(CoroutineDebugging.kt:46)
	at MainKt$testCoroutine$1$num$1.invokeSuspend(Main.kt:8)
	at MainKt$testCoroutine$1.invokeSuspend(Main.kt:7)
Caused by: kotlinx.coroutines.TimeoutCancellationException: Timed out waiting for 1000 ms
```



## 코루틴과 Continuation

### Continuation란?

> 코루틴이 다음에 어디서부터 무엇을 가지고 이어서 실행할지 정보를 담고 있는 객체
>
> 코루틴이 suspend 지점에서 멈출 때, PC(프로그램 카운터), 로컬 변수, Callback 주소 및 리턴 값을 담고 있다.



### suspend와 Continuation

```kotlin
suspend fun fetch(): String
```

위의 문장을 컴파일러가 내부적으로 해석하는 방법은 이런 식으로 변한다.

```kotlin
fun fetch(continuation: Continuation<String>): Any
```

- `Continuation<String>`: fetch 함수가 끝났을 때, 결과 값은 String 정보를 저장할 위치
- 반환 타입이 `Any`인 이유:
  - 중지 없이 끝나는 경우 : 결과를 바로 반환한다.
  - suspend 하는 경우 : 멈췄다는 결과로 `COROUTINE_SUSPENDED` 같은 리턴값을 반환한다.

-> Suspend 함수는 `Continuation` 을 사용한 Continuation Passing Style (CPS)로 변환시키는 기능이다.



```kotlin
public interface Continuation<in T> {
    public val context: CoroutineContext
    public fun resumeWith(result: Result<T>)
}
```





## 참고 문헌

- [https://kotlinlang.org/docs/coroutines-guide.html](https://kotlinlang.org/docs/coroutines-guide.html)
- [https://www.inflearn.com/course/2시간으로-끝내는-코루틴/dashboard](https://www.inflearn.com/course/2시간으로-끝내는-코루틴/dashboard)