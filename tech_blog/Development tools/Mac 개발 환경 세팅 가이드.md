---
created_at: 2026-07-05
updated_at: 2026-07-05
tags:
  - mac
  - dev-environment
  - setup
  - tool
---

# Mac 개발 환경 세팅 가이드

## 0. 개요
이직을 하거나 새 맥북을 받았을 때, 사용자별로 익숙한 설정을 하게 되는데, 그런 저를 위해 작성했습니다.
앞으로 추가적으로 설정하거나 좋은 프로그램 및 플러그인을 찾았을 때 계속 추가해 나갈 예정입니다.


## 1. Oh My Zsh

[Oh My Zsh](https://ohmyz.sh/)는 Zsh 설정을 쉽게 관리할 수 있게 해주는 오픈소스 프레임워크입니다.  
테마, 플러그인, 단축키 등 다양한 기능을 제공해 터미널 생산성을 크게 향상시켜 줍니다.

### 설치

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### 설정 파일 수정 방법

설정 파일(`.zshrc`)을 수정한 뒤에는 반드시 아래 명령어로 변경 사항을 반영해야 합니다.
vi 에디터에서 `i`를 누르면 입력 모드, `esc` 후 `:wq`를 입력하면 저장 후 종료됩니다.

```bash
# 설정 파일 열기
vi ~/.zshrc         
# 변경 사항 즉시 적용
source ~/.zshrc     
```

`.zshrc` 파일은 자주 열고 자주 수정하게 됨으로, 해당 파일 밑에

```bash
alias zshconfig="vi ~/.zshrc"
alias zshreload="source ~/.zshrc"
```
이렇게 추가해 놓는다면, `vi ~/.zshrc` 대신 `zshconfig`로 `source ~/.zshrc` 대신 `zshreload`로 사용할 수 있기 때문에 편리하다


### 테마 변경 (agnoster)

기본 테마도 좋지만, 명령어 바로 옆에 현재 브렌치 명이 표시되는 테마쪽을 좀 더 선호하기 때문에, 일단 테마를 바꿔줍니다.
테마를 바꾸기 위해서는 `~/.zshrc` 파일에서 아래 항목을 찾아 수정합니다.

```bash
# 변경 전
ZSH_THEME="robbyrussell"

# 변경 후
ZSH_THEME="agnoster"
```

참고: agnoster 테마는 iterm에서 폰트가 깨지게 되는데, 깨짐 현상이 있다면 아래의 [D2Coding 폰트](#10-d2coding-폰트)나 다른 Nerd Font를 설치하시면 됩니다.

수정 후 적용:

```bash
source ~/.zshrc
```

### 프롬프트에서 사용자 이름 제거

agnoster 테마는 기본적으로 `사용자명@호스트명`을 표기 하기 때문에, 쉘 스크립트의 앞 부분이 너무 장황해지는 문제가 있습니다. 그렇기 때문에 `~/.zshrc` 파일의 맨 밑에 아래의 텍스트를 추가합니다.

```bash
prompt_context() {
  prompt_segment black default "$USER"
}
```

적용:

```bash
source ~/.zshrc
```

---

## 2. Homebrew

[Homebrew](https://brew.sh/ko/)는 macOS의 사실상 표준 패키지 매니저 취급받는 프로그램으로, CLI 도구부터 GUI 애플리케이션까지 대부분의 개발 도구를 한 곳에서 설치·관리할 수 있기 때문에 필수적으로 깔아줘야한다.

### 설치

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 주요 명령어

| 명령어 | 설명 |
|---|---|
| `brew install <패키지>` | CLI 도구 설치 |
| `brew install --cask <앱>` | GUI 앱 설치 |
| `brew uninstall <패키지>` | 패키지 삭제 |
| `brew update` | Homebrew 자체 업데이트 |
| `brew upgrade` | 설치된 패키지 전체 업그레이드 |
| `brew list` | 설치된 패키지 목록 조회 |
| `brew info <패키지>` | 패키지 정보 확인 |
| `brew doctor` | Homebrew 상태 진단 |

### CLI 설치 vs GUI(Cask) 설치 차이

- `brew install`: Homebrew Cellar에 설치. 터미널에서 명령어로 실행하는 도구 (node, git, python 등). `$PATH`에 자동 등록됩니다.
- `brew install --cask`: `/Applications` 폴더에 `.app` 형태로 설치. 사용자가 클릭해서 실행하는 GUI 앱 (Chrome, Docker Desktop, Zoom 등).

---

## 3. VSCode

[VSCode](https://code.visualstudio.com/)는 Microsoft가 개발한 무료 오픈소스 코드 편집기입니다.  
저는 Git 관리와 각종 텍스트 에디터와 마크다운 툴로써 애용하기 때문에 항상 설치합니다.

### 설치

```bash
brew install --cask visual-studio-code
```

### 터미널에서 `code` 명령어 사용 설정

VSCode를 실행한 뒤 아래 단계를 따릅니다.

1. `Cmd + Shift + P`로 커맨드 팔렛트를 엽니다.
2. `shell command`를 검색합니다.
3. `Shell Command: Install 'code' command in PATH` 를 선택합니다.
4. 터미널을 재실행하면 `code` 명령어를 사용할 수 있습니다.

```bash
# 현재 디렉토리를 VSCode로 열기
code .          
# 특정 디렉토리 열기
code ~/project  
# 특정 파일 열기
code file.txt   
```

---

## 4. Git

[Git](https://git-scm.com/)은 파일 변경 이력을 추적하고 코드를 관리할 수 있게 해주는 버전 관리 시스템입니다.

### 설치

```bash
brew install git
```

### 초기 설정

설치 후 아래 명령어로 정보를 등록합니다.
해당 부분은 커밋에 등록됩니다.

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### SSH 키 생성 및 GitHub 연결

비밀번호 없이 GitHub에 push/pull하려면 SSH 키 설정을 권장합니다.

```bash
# SSH 키 생성
ssh-keygen -t ed25519 -C "your@email.com"

# 공개키 복사
cat ~/.ssh/id_ed25519.pub
```

복사한 공개키를 [GitHub SSH 설정](https://github.com/settings/keys)에 등록합니다.

---

## 5. Docker

[Docker](https://www.docker.com/)는 애플리케이션을 컨테이너 단위로 패키징해 어떤 환경에서도 동일하게 실행할 수 있도록 해주는 가상화 플랫폼입니다.  
최근에는 개발자라면 필수 플랫폼이니 꼭 설치합시다.

### 설치

```bash
brew install docker
brew install --cask docker-desktop
```

> Docker CLI는 `brew install docker`로, GUI 관리 도구는 `--cask docker-desktop`으로 설치합니다.

### 설치 확인

```bash
docker --version
docker-compose --version   # Docker Desktop에 포함됨
```

### 자주 쓰는 명령어

```bash
docker ps                  # 실행 중인 컨테이너 목록
docker ps -a               # 전체 컨테이너 목록
docker images              # 로컬에 저장된 이미지 목록
docker pull <이미지>        # 이미지 다운로드
docker run <이미지>         # 컨테이너 실행
docker stop <컨테이너ID>    # 컨테이너 중지
docker rm <컨테이너ID>      # 컨테이너 삭제
docker rmi <이미지ID>       # 이미지 삭제
```

---

## 6. Java

### 설치 (OpenJDK 17)

Java LTS 버전인 17을 설치합니다.

```bash
brew install openjdk@17
```

설치가 끝나면
```bash
For the system Java wrappers to find this JDK, symlink it with
  sudo ln -sfn /usr/local/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk

openjdk@21 is keg-only, which means it was not symlinked into /usr/local,
because this is an alternate version of another formula.

If you need to have openjdk@21 first in your PATH, run:
  echo 'export PATH="/usr/local/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc

For compilers to find openjdk@21 you may need to set:
  export CPPFLAGS="-I/usr/local/opt/openjdk@21/include"
```
이런 식으로 환경변수 설정 메세지가 나오는데, 경로가 `/usr/local`로 다르다면 보통 intel Mac이기 때문이니 아래의 가이드보단 해당 메세지를 따라서 처리하는 편을 추천한다.


### 심볼릭 링크 환경 변수 설정

JDK를 사용할 수 있도록 환경 변수가 필수적이니 설치해줍니다.

```bash
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

### JAVA_HOME 환경변수 설정

```bash
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 설치 확인

```bash
java -version
javac -version
echo $JAVA_HOME
```

## 7. Python

macOS 기본 Python 대신 버전 관리가 용이한 **pyenv**를 통해 설치합니다.

### pyenv 설치

```bash
brew update
brew install pyenv
```

### pyenv 환경변수 설정

```bash
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
source ~/.zshrc
```

### Python 버전 설치 및 설정

```bash
pyenv install --list          # 설치 가능한 버전 목록 확인
pyenv install 3.12.0          # 원하는 버전 설치
pyenv global 3.12.0           # 전역 기본 버전 설정
pyenv local 3.11.0            # 현재 디렉토리에만 적용 (프로젝트별 설정)
```

### 설치 확인

```bash
python3 --version    # Python 3.12.0
pip3 --version
```

---

## 8. Zsh 편의성 플러그인

### zsh-autosuggestions

이전에 입력한 명령어를 기반으로 자동완성을 제안해 주는 플러그인입니다.  
자동 완성이 제안된다면 오른쪽 화살표(→) 키로 즉시 완성할 수 있습니다.

```bash
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

### zsh-syntax-highlighting

명령어를 입력할 때 실시간으로 문법 하이라이팅을 적용해 줍니다.  
→ 올바른 명령어는 초록색, 잘못된 명령어는 빨간색으로 표시됩니다.

```bash
git clone https://github.com/zsh-users/zsh-syntax-highlighting ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

### 플러그인 활성화

두 플러그인 모두 설치 후 `~/.zshrc`의 plugins 항목에 추가합니다.

```bash
vi ~/.zshrc
```

```bash
plugins=(
    git
    zsh-autosuggestions
    zsh-syntax-highlighting
)
```

> **주의**: `zsh-syntax-highlighting`은 반드시 plugins 목록의 **가장 마지막**에 위치해야 합니다.

```bash
source ~/.zshrc
```

---

## 9. 기타 설정

### 한글 입력 시 백틱(`) 입력 설정

macOS에서 한글 입력 상태일 때 백틱(`` ` ``) 키를 누르면 원화 기호(₩)가 입력됩니다. 코드 작성 시 불편하기 때문에 항상 백틱이 입력되도록 변경하는 방법입니다.

```bash
# KeyBindings 디렉토리 생성
mkdir -p ~/Library/KeyBindings

# 설정 파일 생성
vi ~/Library/KeyBindings/DefaultKeyBinding.dict
```

아래 내용을 입력하고 저장합니다 (esc → `:wq`):

```
{
    "₩" = ("insertText:", "`");
}
```

맥을 **재부팅**하면 한글 입력 상태에서도 `` ` ``가 입력됩니다.

> 참고: [korecmblog - 백틱 고정 방법](https://www.korecmblog.com/blog/backtick-fix)

---

## 10. D2Coding 폰트

[D2Coding](https://github.com/naver/d2codingfont)은 네이버에서 개발한 개발자용 폰트로, 나눔바른고딕을 기반으로 만들어졌습니다.
한글과 영문의 글자 폭을 2:1 비율로 맞춰 코드 정렬이 보기 좋아지기 때문에 항상 설치하는 폰트입니다.

### 설치 방법

[GitHub 릴리즈 페이지](https://github.com/naver/d2codingfont/releases)에서 최신 버전을 다운로드하거나, Homebrew로 설치합니다.

```bash
brew install --cask font-d2coding
```

설치 후 VSCode, iTerm2, inteliji 등의 IDE,에디터,터미널 설정에서 폰트를 `D2Coding`으로 변경합니다.

---

## 참고 문헌

- [Oh My Zsh 공식 문서](https://ohmyz.sh/)
- [Homebrew 공식 사이트](https://brew.sh/ko/)
- [pyenv GitHub](https://github.com/pyenv/pyenv)
- [D2Coding 폰트 GitHub](https://github.com/naver/d2codingfont)
- [백틱(`) 고정 설정 방법](https://www.korecmblog.com/blog/backtick-fix)