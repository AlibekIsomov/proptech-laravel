# PropTech → Java Spring Boot: Microservices o'rganish rejasi

> **Holat:** reja tasdiqlangan, 0-bosqich boshlanmoqda
> **Sana:** 2026-07-25
> **Laravel repo (reference):** `G:\my-laravel-projects\proptech-laravel`
> **Java repo (yangi, alohida):** `G:\my-java-projects\proptech-spring\`

---

## 1. Maqsad

Laravel PropTech platformasining bir qismini Java Spring Boot'da **uchta microservice** sifatida qayta qurish. Maqsad — kod ko'chirish emas, quyidagi bilimlarni chuqurlashtirish:

- Spring Boot core (layered architecture, JPA, validation, exception handling)
- Spring Security + JWT + **custom authentication filter**
- Spring Cloud microservices (Gateway, Resilience4j, Saga)
- Messaging (RabbitMQ) va **async external API processing**
- Observability (Actuator, Micrometer, Prometheus, Grafana, distributed tracing, Loki)
- Caching (Caffeine, Redis)
- Testing (JUnit5, Mockito, Testcontainers)
- Docker + CI/CD

Bu **o'rganish loyihasi**: interview'larda so'raladigan real muammolarni (N+1, memory leak, race condition, deadlock, distributed transaction) tushunib, professional darajada debug qila olish.

**Laravel loyihasi ishlab turadi va xatti-harakat uchun etalon bo'lib qoladi.** Java tomoni uni almashtirmaydi.

---

## 2. Qamrov

### Kiritildi — uchta bounded context, uchta alohida service, uchta alohida DB

| # | Service | Prioritet | Laravel'dagi asli | Nima qiladi |
|---|---------|-----------|-------------------|-------------|
| 1 | `pm-service` | **Yuqori** | `App\Models\PM\Project/Building/Apartment`, `Resident`, `MaintenanceRequest`, `Vendor` | Rezidentlar, texnik xizmat so'rovlari, pudratchilar, PM bino/kvartira inventari |
| 2 | `mahalla-service` | **Yuqori** | `CityReport`, `Telegram\MahallaFix\*`, `ClaudeService::analyzeImage` | Fuqarolarning shahar muammolari (yo'l, chiroq, suv/gaz), rasm yuklash + AI tasniflash |
| 3 | `sales-service` | **Past — oxirida** | `App\Models\Project/Building/Apartment/Client` | Lead/mijoz boshqaruvi, sotuv pipeline, kvartira inventari |

`sales-service` oxirida quriladi. Sabab: Laravel'da bu modul hozir `SalesDisabled` middleware bilan butunlay o'chirilgan (404), ya'ni real ehtiyoj yo'q. Lekin u **Saga #2** uchun kerak, shuning uchun rejadan chiqarilmaydi.

### Nega `mahalla-service` alohida servis bo'lishga eng haqli

Bu qaror faqat "yangi modul" bo'lgani uchun emas. U boshqa ikkitasidan **haqiqatan ham ajralgan**:

- **Boshqa foydalanuvchi bazasi** — fuqarolar, `residents` jadvalida yo'q, `users` jadvalida ham yo'q. Faqat `reporter_telegram_id`.
- **Boshqa autentifikatsiya** — JWT emas, Telegram `initData` HMAC. Ya'ni ikkinchi, mustaqil auth mexanizmi.
- **Boshqa yuklama profili** — rasm yuklash + sekin tashqi AI API chaqiruvi. `pm-service` esa CRUD-og'ir.
- **Boshqa multi-tenancy modeli** — `company_id` bo'yicha filtrlanmaydi, shahar/mahalla bo'yicha ishlaydi.

### Nega u eng ko'p Spring bilimi beradi

Boshida "Telegram = tarjima ishi, Spring o'rgatmaydi" deb chiqarib tashlangan edi. Bu **noto'g'ri bo'ldi** — chiqarib tashlash kerak bo'lgani bot flow'lari (`ResidentFlow`, `VendorFlow` kabi menyu/holat mashinalari), `mahalla-service`ning o'zi emas. U quyidagi to'rt mavzuni **sun'iy misol emas, real use-case** bilan o'rgatadi:

| Mavzu | Nega bu yerda real |
|---|---|
| **Custom Spring Security filter** | Telegram `initData` HMAC tekshiruvi — bu JWT emas, o'zingiz `AbstractAuthenticationProcessingFilter` yozishingiz kerak. JWT'ni starter qilib beradi; buni esa qo'lda qilasiz → Security chain'ni haqiqatan tushunasiz |
| **Async processing (RabbitMQ)** | Claude Vision chaqiruvi 3–10 sekund. HTTP so'rovni bloklab turish mumkin emas → rasm yuklandi → queue → worker tahlil qiladi → natija DB'ga yoziladi → foydalanuvchi polling/notification bilan oladi |
| **Resilience4j — haqiqiy sabab bilan** | Claude API tashqi, sekin, rate-limit'li va o'chib qolishi mumkin. Circuit Breaker + Retry + Timeout + Fallback bu yerda **kerak**, "mashq uchun" emas |
| **File upload va storage** | `MultipartFile`, validatsiya (hajm/MIME), MinIO yoki local volume. `pm-service`da bu yo'q |

### Chiqarib tashlandi

| Nima | Nega |
|---|---|
| Telegram bot **flow'lari** (`UpdateHandler`, `ResidentFlow`, `VendorFlow`, `Keyboards`, `RegistrationService`) | Menyu/holat mashinasi — PHP integratsiya tafsiloti, Spring o'rgatmaydi. `mahalla-service`da faqat **yupqa webhook adapter** + initData tekshiruvi qoladi |
| Resident mobile API (custom token auth) | Bir marta o'rganilgan narsani (token auth) takrorlash. JWT allaqachon 3-bosqichda bor |
| i18n / Uzbek UI matnlari | UI tafsiloti, arxitekturaga aloqasi yo'q |
| React / Inertia frontend | Java tomonda REST API'lar quriladi; UI hozirgi Laravel ilovada qoladi. Postman/`curl` yetarli |
| Kubernetes | Docker Compose bu hajmda yetarli. K8s keyinroq alohida mavzu |
| Kafka | RabbitMQ bilan bir xil tushunchani o'rgatadi. Keyinroq "event streaming" mavzusi sifatida solishtirish mumkin |
| Supabase sync | Laravel-spetsifik mirror mexanizmi |

### Yengil shaklda (nega kerakligini bilish uchun, chuqur emas)

- **Eureka / Service Discovery** — 3 ta servis uchun Docker Compose DNS yetarli. Bir marta qo'shib ko'riladi, qanday muammoni yechishi tushuniladi, keyin ixtiyoriy qoldiriladi.
- **Config Server** — xuddi shunday.

---

## 3. Servislar orasidagi integratsiya

### Muhim qoida: servislar orasida FK yo'q

Har servisning **o'z Postgres konteyneri** bor. `JOIN` qilib bo'lmaydi, `@ManyToOne` qo'yib bo'lmaydi. Bog'lanish faqat:

- oddiy ID ustuni (`sales_apartment_id BIGINT` — JPA relationship **emas**), yoki
- event/command (RabbitMQ), yoki
- REST chaqiruv (Gateway orqali, Resilience4j bilan himoyalangan).

Bu qoidani birinchi kundan buzmaslik kerak — aks holda oxirida ikkita servisni bitta DB'ga qaytarib ulash vasvasasi paydo bo'ladi va butun mashq ma'nosini yo'qotadi.

> **Kuzatuv:** Laravel loyihasida `App\Models\Apartment` va `App\Models\PM\Apartment` allaqachon alohida model, alohida jadval. Ya'ni bounded context'lar amalda to'g'ri ajratilgan — Java tomonda buni faqat rasmiylashtiryapmiz.

### Saga #1 — CityReport eskalatsiyasi (birinchi, `sales-service`siz ishlaydi)

Fuqaro yuborgan muammo boshqariladigan binoga tegishli bo'lsa, u PM tizimida texnik xizmat so'roviga aylanishi kerak.

```
[mahalla-service]  CityReport "verified" holatiga o'tdi va bino ID'si aniqlandi
        │
        │  SagaOrchestrator: saga yozuvi yaratiladi (holat: STARTED)
        │  RabbitMQ command: CreateMaintenanceRequestCommand
        ▼
[pm-service]  MaintenanceRequest yaratadi
        │
        ├─ OK  ──► MaintenanceRequestCreatedReply
        │            │
        │            ▼
        │     [orchestrator] saga: COMPLETED
        │                    CityReport.status = "escalated", pm_request_id yozildi
        │
        └─ XATO ──► MaintenanceRequestFailedReply
                     │
                     ▼
              [orchestrator] compensating action:
                    CityReport.status = "escalation_failed"
                    saga: COMPENSATED
                    metrika: saga_compensation_total{saga="city_report_escalation"} +1
```

### Saga #2 — Kvartira sotildi (oxirida, `sales-service` qurilgach)

```
Mijoz kvartira sotib oladi
        │
        ▼
[sales-service]  Apartment → "sold", Sale yozuvi yaratiladi
        │
        │  SagaOrchestrator: CreateResidentCommand
        ▼
[pm-service]  Resident yaratadi
        │
        ├─ OK  ──► ResidentCreatedReply → saga COMPLETED
        │
        └─ XATO ──► ResidentCreationFailedReply
                     │
                     ▼
              compensating action: Sale bekor qilinadi,
              Apartment → "available"ga qaytariladi
```

### Orchestration, choreography emas — aniq farq

Tanlov: **orchestration**. Sabab — butun oqim bitta joyda ko'rinadi, debug qilish oson.

Buni to'g'ri qilish uchun quyidagilar shart (aks holda bilmagan holda choreography yozib qo'yiladi):

1. **Markazlashgan koordinator** — `SagaOrchestrator` (`pm-service` yoki alohida modulda). Servislar bir-birini bilmaydi, faqat orchestrator'ni biladi.
2. **Saga holati DB'da saqlanadi** — `saga_instance` jadvali: `saga_id`, `type`, `state` (`STARTED`/`COMPLETED`/`COMPENSATING`/`COMPENSATED`/`FAILED`), `current_step`, `payload`, `created_at`, `updated_at`. Holat xotirada saqlansa, servis restart bo'lganda yarim tugagan saga'lar yo'qoladi.
3. **Command va Reply farqlanadi** — orchestrator *buyruq* yuboradi (`CreateResidentCommand`), servis *javob* qaytaradi (`ResidentCreatedReply`). Bu "event publish qilish"dan boshqa narsa: event'ni kim eshitishi noma'lum, command aniq bitta manzilga boradi.
4. **Idempotentlik** — RabbitMQ "at least once" kafolat beradi, ya'ni bir xil command ikki marta kelishi mumkin. Har consumer `message_id` yoki business key bo'yicha takrorni aniqlab, ikkinchi marta hech narsa qilmasligi kerak. **Bu interview'da eng ko'p so'raladigan nuqta.**

> Choreography esa: har servis event chiqaradi, boshqasi eshitadi, javob event qaytaradi — markazda hech kim yo'q, oqim tarqalgan. Sodda holatlar uchun yaxshi, lekin 3+ qadamda kuzatib bo'lmaydi.

---

## 4. Ishlash tartibi (kelishilgan qoidalar)

1. **Roadmap bosqichma-bosqich beriladi** — har safar bitta bosqich, keyingisiga o'tishdan oldin tugatiladi.
2. **Kod to'liq yozib berilmaydi** — spetsifikatsiya, struktura va "tugadi" mezoni beriladi; implementatsiyani foydalanuvchi o'zi yozadi, keyin review/tushuntirish so'raydi.
3. **Savol berilganda tushuntiriladi** — nazariy asos + "real hayotda bu muammo qanday yuzaga keladi".
4. **Har bosqichda ATAYIN xato kiritiladi**, keyin professional debug qilinadi — profiler, heap dump, Grafana, `EXPLAIN ANALYZE` bilan, "ko'zdan o'tkazib topish" bilan emas.

---

## 5. Roadmap

### 0-bosqich — Skeleton
- Ikkita Spring Boot loyiha: `pm-service`, `mahalla-service` (`sales-service` 10-bosqichda qo'shiladi)
- Java 21 LTS, Spring Boot 3.5.x
- Initializr: Web, Spring Data JPA, PostgreSQL Driver, Validation, Lombok, Actuator, Flyway
- Har servisga alohida Postgres konteyner (bitta konteynerda ikki schema **emas**)
- Paket strukturasi: `domain` / `repository` / `service` / `web` / `config` / `exception`
- `docker-compose.yml`: 2 servis + 2 DB, healthcheck bilan
- Spring Profiles: `application-dev.yml` (IDE'dan) va `application-docker.yml` (konteyner ichidan)

**Tugadi mezoni:** `docker compose up` → hamma konteyner `healthy`; `/actuator/health` → `UP` (ichida `db` ham); Flyway `V1__init.sql` ishlagan va `flyway_schema_history` paydo bo'lgan.

**Birinchi tuzoq:** konteyner ichidan `localhost:5433` ishlamaydi — Compose network'ida servis nomi (`pm-db:5432`) ishlatiladi. Aynan shu narsa Spring Profiles nima uchun borligini amalda ko'rsatadi.

### 1-bosqich — Core Spring: `pm-service`
- Controller → Service → Repository qatlamlari
- Entity'lar: `Project`, `Building`, `Apartment`, `Resident`, `MaintenanceRequest`, `Vendor`
- Bean Validation (`@Valid`, custom validator)
- `@ControllerAdvice` bilan global exception handling + bitta xil xato javob formati
- MapStruct: Entity ↔ DTO (entity'ni to'g'ridan-to'g'ri qaytarmaslik — nega, tushuntirib beriladi)
- Flyway migration'lari

**Ataylab kiritiladigan muammo — N+1:** `MaintenanceRequest → Resident + Vendor` ikkalasini ro'yxatda chiqarish. `spring.jpa.show-sql` bilan 1 + 2N so'rovni ko'rish, keyin `@EntityGraph` / `JOIN FETCH` bilan tuzatish. Qo'shimcha: `JOIN FETCH` + pagination birga ishlaganda nima bo'ladi (`HHH000104` ogohlantirishi) — bu alohida saboq.

### 2-bosqich — Core Spring: `mahalla-service`
- Entity: `CityReport` (`category`, `priority`, `status`, `reporter_telegram_id`, lat/lon, rasm yo'llari)
- Rasm yuklash: `MultipartFile`, hajm/MIME validatsiyasi, storage abstraksiyasi (local volume, keyinroq MinIO)
- Hozircha AI tahlili **sinxron** (ataylab) — 4-bosqichda buni async'ga o'tkazamiz va farqni o'lchaymiz
- `RestClient` bilan Claude API integratsiyasi

**Ataylab kiritiladigan muammo:** sinxron AI chaqiruvi. Timeout qo'yilmagan `RestClient` bilan 10 parallel so'rov yuborilganda Tomcat thread pool to'lib qoladi (`server.tomcat.threads.max`). Buni yuklama bilan ko'rsatish → **thread pool exhaustion** nima ekanini his qilish → 4-bosqichda async bilan yechish.

### 3-bosqich — Xavfsizlik
- `pm-service`: Spring Security + JWT (access/refresh), role-based authorization
- Rollar Laravel'dagi Spatie rollariga mos: `SUPER_ADMIN`, `COMPANY_ADMIN`, `MANAGER`, `PROPERTY_MANAGER`, `DISPATCHER`, `VENDOR`, `RESIDENT`
- **Multi-tenancy** — Laravel'dagi `CompanyScope` global scope'ining Java ekvivalenti. Hibernate `@Filter` yoki `@TenantId`, JWT'dan olingan `company_id` bilan. **Eng katta xavfsizlik xatosi shu yerda bo'ladi** — filtr bir joyda qo'llanmasa, tenant ma'lumotlari oqib ketadi
- `mahalla-service`: **custom authentication filter** — Telegram `initData` HMAC tekshiruvi (`AbstractAuthenticationProcessingFilter`). Laravel'dagi `Services\Telegram\WebAppAuth` bilan bir xil algoritm: `secret = HMAC-SHA256(botToken, "WebAppData")`, check-string `hash`dan tashqari hamma maydonlar, `\n` bilan, kalit bo'yicha saralangan
- (Ixtiyoriy) OAuth2 Google login

**Ataylab kiritiladigan muammo:** tenant filtrini bitta repository metodida qo'llamaslik → boshqa kompaniyaning rezidentlari ko'rinadi. Buni test bilan tutish → nega integration test bunday xatolarni unit test'dan ko'ra yaxshi tutadi.

### 4-bosqich — Messaging + async AI
- RabbitMQ Docker Compose'ga qo'shiladi
- 2-bosqichdagi sinxron AI chaqiruvi async'ga o'tadi: rasm yuklandi → `ImageAnalysisRequested` → worker → natija DB'ga → `CityReport.status` yangilanadi
- Dead Letter Queue (DLQ) — muvaffaqiyatsiz xabarlar qayerga boradi
- Retry policy: exponential backoff, `maxAttempts`
- **Idempotentlik** — bir xil xabar ikki marta kelganda ikkinchi tahlil qilinmasligi

**O'lchash:** 2-bosqichdagi thread pool exhaustion yo'qolganini yuklama testi bilan ko'rsatish. Bu — async'ning nima uchun kerakligining raqamli isboti.

### 5-bosqich — Saga #1 (CityReport → MaintenanceRequest)
- `saga_instance` jadvali va `SagaOrchestrator`
- Command/Reply xabar turlari
- Compensating action va uning testi
- Ataylab: `pm-service`ni saga o'rtasida o'chirib qo'yish → saga `STARTED` holatida "osilib" qolishi → **timeout/recovery mexanizmi** kerakligini ko'rish (scheduled job eski saga'larni topib compensate qiladi)

### 6-bosqich — Gateway + Resilience
- Spring Cloud Gateway: ikkala servis oldida, routing + rate limiting
- Resilience4j **haqiqiy use-case bilan**: Claude API uchun Circuit Breaker + Retry + Timeout + Fallback (fallback = "AI tasnifi mavjud emas, qo'lda tekshirish kerak")
- `pm-service` o'chganda `mahalla-service` qanday reaksiya qiladi
- (Yengil) Eureka — nega kerakligini tushunish uchun

### 7-bosqich — Observability
- Actuator + Micrometer + Prometheus + Grafana (Laravel tomonda qurilgan bilim to'g'ridan-to'g'ri ko'chadi)
- Distributed tracing (Zipkin yoki Tempo) — "rasm yuklandi → AI tahlil → saga → MaintenanceRequest" oqimini uchidan-uchigacha bitta trace'da ko'rish
- Markazlashgan logging: Loki + Promtail, `traceId` bilan bog'langan
- Custom metrikalar: `saga_compensation_total`, `ai_analysis_duration_seconds`, `circuit_breaker_state`

### 8-bosqich — Caching + memory leak mashqi
- Caffeine (local): `pm-service`da kvartira/bino ro'yxati
- Redis (distributed): Gateway rate limiting va sessiyalar uchun
- **Ataylab:** `maximumSize` qo'yilmagan cheksiz Caffeine cache → Grafana'da heap o'sishini kuzatish → `jmap` bilan heap dump → Eclipse MAT / VisualVM bilan sababni topish → tuzatish
- Cache invalidation: yozuv o'zgarganda eski qiymat qolib ketishi (stale cache) — bu ham ataylab kiritiladi

### 9-bosqich — Testing
- JUnit5 + Mockito: service qatlami uchun unit testlar
- Testcontainers: real Postgres + RabbitMQ bilan integration testlar
- Saga'ning compensation yo'lini test bilan qoplash
- `@DataJpaTest` bilan N+1'ni **testda** tutish (Hibernate statistics assertion)

### 10-bosqich — `sales-service` + Saga #2
- Core Spring: `Client`, `Project`, `Building`, `Apartment`, `Sale`
- Saga #2: kvartira sotildi → resident yaratildi (yuqoridagi diagramma)
- **Ataylab: race condition** — ikki foydalanuvchi bir vaqtda bitta kvartirani sotib oladi. Avval himoyasiz qoldirish va ikkalasi ham muvaffaqiyatli bo'lishini ko'rsatish, keyin: optimistic locking (`@Version`) va pessimistic locking (`SELECT FOR UPDATE`) — ikkalasini qurib, farqini o'lchash
- **Ataylab: deadlock** — ikki tranzaksiya jadvallarni teskari tartibda qulflaganda. Postgres `pg_locks` bilan ko'rish, `deadlock_timeout` logini o'qish

### 11-bosqich — Deploy
- Multi-stage `Dockerfile` (har servis uchun), layered JAR
- Yagona `docker-compose.yml`: 3 servis + 3 Postgres + RabbitMQ + Redis + Gateway + Prometheus + Grafana + Loki
- GitHub Actions CI/CD: build → test (Testcontainers bilan) → image → deploy
- Laravel loyihada yechilgan SSH/secrets/zero-downtime tajribasi bevosita qo'l keladi

---

## 6. Ataylab kiritiladigan muammolar — jamlanma

Interview'da so'raladigan har bir klassik muammo qaysi bosqichda va qanday vosita bilan:

| Muammo | Bosqich | Debug vositasi |
|---|---|---|
| N+1 query | 1 | `show-sql`, Hibernate statistics, `EXPLAIN ANALYZE` |
| `JOIN FETCH` + pagination | 1 | `HHH000104` ogohlantirishi |
| Thread pool exhaustion | 2 | yuklama testi, thread dump (`jstack`) |
| Tenant ma'lumot oqishi | 3 | integration test |
| Xabar takrorlanishi (at-least-once) | 4 | DLQ, idempotentlik kaliti |
| Osilib qolgan saga | 5 | `saga_instance` jadvali, recovery job |
| Tashqi API o'chishi | 6 | Circuit Breaker metrikasi |
| Memory leak | 8 | Grafana heap grafigi, `jmap` + heap dump, MAT |
| Stale cache | 8 | cache invalidation testi |
| Race condition | 10 | parallel test, `@Version`, `SELECT FOR UPDATE` |
| Deadlock | 10 | `pg_locks`, Postgres deadlock logi |

---

## 7. Texnologiya tanlovlari va sabablari

| Tanlov | Nega |
|---|---|
| Java 21 LTS | Spring Boot 4 chiqqan bo'lsa ham, production va interview savollarida 3.x hukmron; o'quv materiali ko'proq |
| Spring Boot 3.5.x | Xuddi shu sabab. Joriy aniq versiyani `start.spring.io`dan tekshirish |
| Postgres, har servisga alohida konteyner | Haqiqiy izolyatsiyani his qilish. Bitta konteynerda ikki schema — yarim yechim, o'rgatmaydi |
| Flyway (0-bosqichdan) | `ddl-auto: update` bilan boshlab keyin Flyway'ga o'tish og'riqli. Hozirdan qo'yilsa `ddl-auto: validate` ishlaydi — bu production odati |
| RabbitMQ (Kafka emas) | Event hajmi past, RabbitMQ oddiyroq, use-case'ga mos. Kafka keyinroq alohida solishtirish mavzusi |
| Orchestration (choreography emas) | 3+ qadamli oqimni kuzatib bo'lish uchun; debug osonligi |
| Gradle yoki Maven | Ixtiyoriy. Maven — interview'larda ko'proq uchraydi; Gradle — tezroq. Ikkalasi ham to'g'ri |

---

## 8. Ochiq savollar

- **Build tool:** Maven yoki Gradle? (Maven interview uchun ko'proq tanish)
- **Saga orchestrator qayerda yashaydi:** `pm-service` ichida modul, yoki to'rtinchi mustaqil `saga-orchestrator` servis? (Boshlash uchun `pm-service` ichida soddaroq; alohida servis "toza"roq lekin infra qo'shadi)
- **Rasm storage:** local Docker volume bilan boshlab keyin MinIO'ga o'tiladimi, yoki darrov MinIO? (S3 API bilan ishlash tajribasi qo'shimcha qiymat beradi)
- **`sales-service` prioriteti:** oxirida qurish tasdiqlanadimi?
