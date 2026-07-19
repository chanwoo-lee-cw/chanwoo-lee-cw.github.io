---
created_at: 2026-07-02
updated_at: 2026-07-02
tags:
  - redis
  - lua
  - script
---

# Lua Script

## Lua Script란?

> Lua는 1993년 브라질에서 만들어진 가벼운 임베디드 스크립트 언어
> 이름은 포르투갈어로 "달"이라는 뜻이다.

## 핵심 특징

- 경량성과 임베디드 친화적
- 인터프리터가 ~200KB 정도로 매우 작음
- C로 작성되어 있고 C API가 깔끔해서 다른 프로그램에 내장하기 쉬움

## 변수

지역 변수는 항상 local을 붙힌다.

```lua
local x = 10          -- 지역 변수
y = 20                -- 전역 변수
local a, b, c = 1, 2, 3  -- 다중 할당
```

## 타입

LuaScript는 기본이 동적할당이다.

```lua
-- 8가지 기본 타입
local n = nil
local b = true
local num = 3.14      -- number (정수/실수 구분 없음, Lua 5.3+는 integer/float 분리)
local s = "hello"
local t = {}          -- table
local f = function() end  -- function
```

## 연산자

```lua
-- 산술
print(7 / 2)   -- 3.5  (항상 실수)
print(7 // 2)  -- 3    (정수 나눗셈)
print(2 ^ 10)  -- 1024 (거듭제곱)
-- 비교
print(7 == 7)   -- true  (같은)
print(7 ~= 2)   -- true  (같지 않음)
print(7 > 2)    -- true  (큼)
print(2 < 7)    -- true  (작음)
print(7 >= 2)   -- true  (같거나 큼)
print(2 <= 7)   -- true  (같거나 작음)

-- 논리: and or not
local x = a or 10               -- a가 nil/false면 10 (기본값 패턴)
local y = cond and v1 or v2     -- 삼항 연산자 흉내

-- nil과 false만 거짓!
if 0 then print("true") end     -- 출력됨
if "" then print("true") end    -- 출력됨
```

## 제어문

### 조건문

```lua
-- if / elseif / else
if x > 0 then
    print("+")
elseif x < 0 then
    print("-")
else
    print("0")
end
```

### 반복문

#### while

```lua
-- while
local i=1
while i < 10 do
    print(i)
    i = i + 1
end
```

#### repeat

`repeat ... until` (do-while과 비슷, 조건이 반대)

```lua
local i = 1

repeat
    print("i value of", i)
    i = i + 1
until i >= 5
```

```
i value of      1
i value of      2
i value of      3
i value of      4
```

#### for

```lua
-- 숫자 for (시작, 끝, 증가값)
for i = 1, 10 do print(i) end       -- 1~10
for i = 10, 1, -1 do print(i) end   -- 역순
```

#### for each

**pairs**

```lua
for k, v in pairs(table) do ... end    -- 모든 키
```

```lua
-- 제네릭 for
table = {name = 'user', age = 10} 

for k, v in pairs(table) do 
    print(k,":",v)
end 
```

```
age     :       10
name    :       user
```

이런식으로 순서가 그대로 나오지 않는다.


**ipairs**

```lua
for i, v in ipairs(array) do ... end   -- 배열 (1부터 nil 만날 때까지)
```

```lua
array = {1,3,5,2,7} 

for i, v in ipairs(array) do
    print(i,":",v)
end 
```

```
1       :       1
2       :       3
3       :       5
4       :       2
5       :       7
```

**break**

```lua
--break는 다른 언어와 동일하다
for i = 1, 10 do
    if i == 5 then break end
    print(i)
end
```

```
1
2
3
4
```



**continue**

continue는 없다. 그나마 goto로 흉내내는게 최선

```lua
for i = 1, 10 do
    if i % 2 == 0 then goto continue end
    print(i)
    ::continue::
end
```

```
1
3
5
7
9
```



## 함수

```lua
-- 기본
local function add(a, b)
    return a + b
end

local add = function(a, b) return a + b end
```

 기본적인 함수 형태이다.



### 다중 반환값 (multiple return values)

다른 언어들처럼 튜플로 반환이 아니라. 정말로 여러 값을 반환한다.

```lua
-- 다중 반환값 ★ Lua의 핵심 특징
local function divmod(a, b)
    return a // b, a % b
end
local q, r = divmod(17, 5)  -- 3, 2
```

**장점**

받는 방식이 유연하다

```lua
local q, r = divmod(17, 5)   		-- q=3, r=2  (둘 다 받음)
local q = divmod(17, 5)      		-- q=3       (첫 번째만 받음, 나머지 버림)
local q, r, x = divmod(17, 5) 	-- q=3, r=2, x=nil  (모자라면 nil)
```

**주의할점**

 표현식 중간에 있으면 첫 값만 살아남음

```lua
local function f() return 1, 2, 3 end

-- 마지막 위치: 모든 값 살아남음
print(f())              -- 1  2  3
local a, b, c = f()     -- a=1, b=2, c=3
local t = {f()}         -- {1, 2, 3}

-- 마지막이 아닌 위치: 첫 번째만 살아남음
print(f(), "end")       -- 1  end       ← 2, 3 사라짐!
local t = {f(), 99}     -- {1, 99}      ← 2, 3 사라짐!
local a, b = f(), 10    -- a=1, b=10    ← 2, 3 사라짐!
```

괄호로 묶어버리면 강제로 첫번째만 살아남는다

```lua
local a, b = (f())   -- a=1, b=nil  ← 괄호가 1개로 줄여버림
```

#### 활용법

결과 + 에러 반환

```lua
local function findUser(id)
    if id < 0 then
        return nil, "invalid id"   -- 실패: nil + 에러 메시지
    end
    return {name = "User"}, nil      -- 성공: 값 + nil
end

local user, err = findUser(-1)
if err then
    -- 에러 처리
end
```



### 가변인자

`...`  나머지 인자를 모두 모은다는 뜻. 다른 언어인 `*args`(Python), `vararg`(Kotlin)랑 같은 개념

```lua
local function sum(...)
    local args = {...}    -- 가변 인자를 테이블로 변환
    local total = 0
    for _, v in ipairs(args) do
        total = total + v
    end
    return total
end

sum(1, 2, 3)         -- 6
sum(1, 2, 3, 4, 5)   -- 15
sum()                -- 0
```

#### 활용법

**slice**

```lua
local function otherFunc(array)
    -- print(array)
    for i, v in ipairs(array) do
        print(v)
    end
end

local function demo(...)
    -- 1. 테이블로 모으기 (가장 흔한 방식)
    local args = {...}
    print(#args)          -- 인자 개수

    -- 2. select로 직접 접근
    local n = select("#", ...)   -- 인자 개수
    local second = {select(2, ...)} -- 2번째부터 끝까지, 리턴 값이 여러개이므로 테이블로 묶는다.

    -- 3. 그대로 다른 함수에 전달 (pass-through)
    return otherFunc(second)
end

demo(1,2,3,4)
```



가변 인자는 항상 마지막에 와야한다.

```lua
-- 가능
local function logEvent(level, message, ...)
    local extras = {...}
    -- ...
end
logEvent("INFO", "user login", userId, timestamp)

-- 불가능 - 문법 에러
local function bad(..., last)
```



#### Redis의 가변인자

Redis Lua Script를 기준으로 생각해 봤을 때, `ARGV[]`가 사실상 이런 가변 인자 역할.

```lua
-- 만약 ARGV를 다른 함수로 그대로 넘기고 싶은 경우

local function processAll(...)
    for i = 1, select("#", ...) do
        local v = select(i, ...)
        -- 처리
    end
end

processAll(unpack(ARGV))   -- ARGV 테이블을 풀어서 가변 인자로
-- Lua 5.2+에서는 table.unpack
```



## 테이블

Lua Script의 유일한 자료 구좆.

별도의 array, dict, object 같은 자료구조 전부 없다. 사용하는 방식에 따라 배일이나 해시 맵 처럼 사용.

```lua
local t = {}
t[1] = "a"        -- 배열처럼
t["name"] = "User" -- 해시맵처럼
-- 같은 테이블 안에 둘 다 가능!
```

- 내부적으로 Lua는 테이블을 **배열 파트(array part) + 해시 파트(hash part)** 두 영역으로 나눠서 관리한다.
- 1부터 시작하는 연속된 정수 키는 배열 파트에, 나머지는 해시 파트에 저장해서 메모리/속도 최적화를 한다.

### 배열

```lua
local arr = {"a", "b", "c"}
print(arr[1])
for i, v in pairs(arr) do
    print(i,":",v)
end
```

키 없이 할당하면 자동으로 키 `[1]`, `[2]`, `[3]`에 할당된ㄷ. 

다른 언어에서 `["a", "b", "c"]`로 쓰던 배열 리터럴이랑 비슷하게 쓰는 방법이라고 보면 된다.

### 주의할점 = `#`은 써서는 안된다.

```lua
local arr = {"a", "b", nil, "d"}
print(#arr)   -- 2 또는 4 (구현에 따라!)
```

- Lua는 `#`을 계산할 때 "nil로 끝나는 경계"를 찾기 때문에
- 중간에 nil이 있으면 어디가 끝인지 모호해집니다.
- 빈 자리를 표현하고 싶으면 `false`나 다른 `__NIL__`같은sentinel 값을 쓰는 게 안전합니다.


## 에러 처리

### Error rasie

```lua
error("에러 발생")
```

```lua
error({code = "INSUFFICIENT", message = "재고 부족"})
```

- Java의 `throw new Exception("...")`와 같은 역할.
- error()를 호출하면 함수가 중단되고, 호출 스택을 거슬러 올라가며 전파된다.

```lua
local function divide(a, b)
    if b == 0 then
        error("0으로는 나눌 수 없습니다.")
    end
    return a / b
end

divide(10, 0)   -- 에러 발생 → 프로그램 죽음
```

### `pcall()` : catch

```lua
local ok, err = pcall(
    function()
        error("에러 발생")
    end
)
```

- Java나 Go의 catch 같은 역할
- 블록 구역 에러가 나면 → ok = false, err = 에러 메시지 반환
- 에러 없이 끝나면 → ok = true, 그 뒤에 함수의 반환값들
- 즉, 에러를 반환값으려 변환해준다.
  - Go의 value, err := ... 패턴이랑 같다.

```lua
-- 에러 케이스
local ok, err = pcall(function()
    error("에러 발생")
end)
print(ok, err)   -- false   "input:2: 에러 발생"  (파일:줄번호가 자동으로 붙음)

-- 성공 케이스
local ok, result = pcall(function()
    return 42
end)
print(ok, result)   -- true   42
```

### 기존 함수 호출

```lua
local function risky(a, b)
    if b == 0 then error("0 division") end
    return a / b
end

local ok, result = pcall(risky, 10, 2)
--                       ↑      ↑   ↑
--                     함수   arg1 arg2
```

pcall(f, a, b, c)은 f(a, b, c)을 실행한다는 뜻이다.


### 다중 반환인 경우

```lua
local function divmod(a, b)
    if b == 0 then error("0으로는 나눌 수 없습니다.") end
    return a // b, a % b      -- 두 값 반환
end

local ok, q, r = pcall(divmod, 17, 5)
-- ok=false, q="0으로는 나눌 수 없습니다."  ← 에러 시엔 두 번째 자리가 에러 메시지
```


## 모듈

```lua
-- mymodule.lua
local M = {}

function M.hello()
    return "hi"
end

return M

-- main.lua
local mymodule = require("mymodule")
print(mymodule.hello())
```

## 헷갈리기 쉬운 포인트 정리

1. 인덱스 1부터 — 가장 많이 실수하는 부분
2. ~= (같지 않음, != 아님)
3. .. (문자열 연결, + 아님)
4. local 안 붙이면 전역 — 항상 붙이는 습관
5. nil/false만 거짓 — 0은 참
6. : vs . — 메서드 호출 시 self 자동 전달 여부
7. pairs vs ipairs — 순서 필요하면 ipairs, 모든 키는 pairs