Get on the boat.

## 컨셉

- 연습 목적이므로 백엔드 구현이 적합하다.
- 엥간한 연산은 consistency를 보장하기 위해 서버에서 수행한다.
- Latency를 보정하기 위해 Tick rate를 조절할 수 있어야 함
- 일반적인 Database의 연습 차원에서 로그인, 세션, 상점, 랭킹 등을 구현할 수 있으면 좋겠다.
- 벤치마킹 하기 위한 interface가 있어야 함
  - 주변 사물 세팅 등
- 나중에 latency 문제로 client side engine으로 migration 되어도 테스트 셋 그대로 사용해서 테스트할 수 있어도 좋겠다.
  - P2p network, voting algorithm으로 validation

## Spec

- 공통 사항
  - 월드 및 엔티티 세팅
    - 배의 크기는 원형으로 지름이 1임
    - 사물의 크기는 없음
    - 위치 값의 최소 단위는 0.001
    - 획득 인터랙션은 사물과 닿아야 가능
    - 배 끼리 닿으면 파괴됨 / 사물에 닿아도 파괴되지 않음
    - 바둑판 식으로 구성되어 월드 끝과 끝이 이어져야 함
- User facing interface
  - 유저 관리
    - 로그인 -> 토큰 부여
  - 세션 생성이 가능해야 함
    - 존재하지 않는 세션의 경우 새로 생성됨
  - 세션 조인이 가능해야 함
    - 2인 이상이 세션에 존재하면 자동으로 시작
  - 배를 운전할 수 있어야 함
    - 각속도와 속력을 입력하면 틱 레이트에 따라서 위치가 자동으로 계산됨
  - 주변 엔티티를 불러올 수 있어야 함
    - 시야 내 배와 사물이 불러와짐
  - 사물과의 인터렉션이 가능함
    - 0.5 거리 내면 인터랙션 가능
    - 일단은 획득 정도만 가능하게
- Test interface
  - 사물 세팅이 static하게 가능해야 함
  - 월드 크기를 설정할 수 있어야 함
  - 틱 레이트를 마음대로 변경 할 수 있어야 함 (0으로)
  - 특정 틱에 breakpoint를 걸 수 있어야 함 / 다시 시작할 수 있어야 함
  - 배 위치 세팅을 할 수 있어야 함

## Features on Reference Implementation

Done ✔️ / Not Yet ❌

- Multiplexing
  - ✔️ 세션별로 State 분리
  - ✔️ 플레이어 구분
- Entity / Engine
  - ✔️ 속도 조절
  - ✔️ 거리 내 다른 엔티티 (플레이어 포함) 표시
  - ❌ 키보드 컨트롤 구현하기
    - ❌ Latency 보정하기
  - ❌ 무한 월드 구현하기
    - ❌ Position을 Range 안으로 제한
    - ❌ World Coordinate 밖으로도 스캔 가능하도록 하기
  - ❌ 배끼리 충돌하는 것 구현하기
- Game Rule
  - ❌ 승리 조건 / State 구현하기
  - ❌ 다른 아이템과 인터랙션 할 수 있도록 하기
- State Sync
  - ✔️ Server State 자동 업데이트
    - ✔️ 0.1초마다 fetch
    - ❌ 60fps로 Latency 최적화
- Etc
  - ❌ 레퍼런스 서버 리팩터링
    - Route / Entity / World의 분리
