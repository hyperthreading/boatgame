Get on the boat.

- 컨셉
    - 연습 목적이므로 백엔드 구현이 적합하다.
    - 엥간한 연산은 consistency를 보장하기 위해 서버에서 수행한다.
    - Latency를 보정하기 위해 Tick rate를 조절할 수 있어야 함
    - 일반적인 Database의 연습 차원에서 로그인, 세션, 상점, 랭킹 등을 구현할 수 있으면 좋겠다.
    - 벤치마킹 하기 위한 interface가 있어야 함
        - 주변 사물 세팅 등
    - 나중에 latency 문제로 client side engine으로 migration 되어도 테스트 셋 그대로 사용해서 테스트할 수 있어도 좋겠다.
        - P2p network, voting algorithm으로 validation
- 스펙
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
    - example test scenario
        - Ship
            - 배가 앞으로 움직인다.
                - 틱 정지
                - 틱 breakpoint를 100 (10s * 10 tick)에 설정
                - 배의 속력을 1u/s로 설정한다
                    
                    ```jsx
                    POST /sessions/test/player/boat/set
                    Authorization: abcdef
                    Content-Type: application/json
                    
                    { "data": { "velocity": 1 } }
                    ```
                    
                - 틱레이트를 초당 10번으로 설정한다.
                    
                    ```jsx
                    POST /sessions/test/engine/tick/set
                    Content-Type: application/json
                    
                    { "data": { "tickrate": 10 } }
                    ```
                    
                - 틱 시작
                - 11초가 지나면 배가 10만큼 움직여야 한다.
                    - sleep(10)
                    - GET /sessions/test/ship
                    - assert getDistance(oldData.position, response.body.data.position) == 10
            - 배가 회전할 수 있다.
                - 틱 정지 / breakpoint 설정
                - 각속도를 10deg/s으로 설정
                - 틱레이트 설정
                - 틱 시작
                - 각속도 설정 후 10초가 지나면 배가 80 이상 회전해야 한다.
        - World
            - 바둑판 식으로 이어져, 일정 거리 이동 후에 같은 사물이 보여야 함
                - 틱 정지
                - 월드 크기를 10x10으로 설정
                    
                    ```jsx
                    POST /sessions/test/world-length
                    Authorization: abcdef
                    
                    { “data”: { “world_length”: 10 } }
                    ```
                    
                - 스캔 범위를 5u로 설정
                    
                    ```jsx
                    POST /sessions/test/player/boat/set
                    Authorization: abcdef
                    Content-Type: application/json
                    
                    {
                      "data": {
                        "scan_range": 3
                      }
                    }
                    ```
                    
                - 사물 목록을 설정
                    
                    ```jsx
                    POST /sessions/test/set_object_list
                    Authorization: abcdef
                    Content-Type: application/json
                    
                    { 
                      "data": [
                        { "id": "1", "type": "none", "position": { "x": 0, "y": 0 } } 
                      ]
                    }
                    ```
                    
                - 배 위치를 설정
                    
                    ```jsx
                    POST /sessions/test/update_player
                    Authorization: abcdef
                    
                    {
                      "data": {
                        "player_data_list": [
                          { 
                            "id": "test_player", 
                            "boat": {
                              "position": { "x": 0, "y": 0 },
                              "angle": 0,
                              "velocity": 0
                            }
                          }
                        ]
                    	}
                    }
                    ```
                    
                - 틱 100만큼 진행하도록 함
                - 틱 시작
                - 주변 사물 불러왔을때 사물 1이 존재함
                    
                    ```jsx
                    GET /sessions/test/player/boat/scan
                    Authorization: abcdef
                    ```
                    
                    Response
                    
                    ```jsx
                    {
                      "data": [
                        { "id": "1", "type": "none", "position": { "x": 0, "y": 0 } }
                      ]
                    }
                    ```
                    
                - 0 각도로 1속도로 10 만큼 이동
                    
                    ```jsx
                    POST /sessions/test/player/boat/set
                    
                    {
                      "data": {
                        "velocity": 1
                      }
                    }
                    ```
                    
                - 11초 후 주변 사물 불러왔을 때 사물 1이 존재함
                    
                    ```jsx
                    GET /sessions/test/player/boat/scan
                    Authorization: abcdef
                    ```
                    
                    Response
                    
                    ```jsx
                    {
                      "data": [
                        { "id": "1", "type": "none", "position": { "x": 0, "y": 0 } }
                      ]
                    }
                    ```