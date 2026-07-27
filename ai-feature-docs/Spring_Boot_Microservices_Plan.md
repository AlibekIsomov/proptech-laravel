# PropTech → Java Spring Boot: reja qayerda

> Bu fayl — **ko'rsatkich, reja emas.** Rejaning o'zi boshqa repoda va u yagona haqiqat manbasi.

Bu yerda avval rejaning to'liq nusxasi turgan edi. Nusxa bir kun ichida eskirdi
(0-bosqich "boshlanmoqda" deb qoldi, 1-bosqich allaqachon tugagan bo'lsa ham), shuning
uchun olib tashlandi. Bir reja — bir joyda.

## Reja qayerda

| | |
|---|---|
| Repo | `https://github.com/AlibekIsomov/proptech-spring` (private) |
| Lokal | `G:\my-java-projects\proptech-spring` |
| Reja | `docs/PLAN.md` — qamrov, saga dizayni, 12 bosqich, ataylab kiritiladigan defektlar jadvali |
| Ishlash qoidalari + hozirgi bosqich | `CLAUDE.md` (Claude Code uni avtomatik o'qiydi) |
| Har bosqich hisoboti | `docs/STAGE1.md`, `docs/STAGE2.md`, ... — nima qurildi, qaysi muammoga urildik, qanday tuzatildi |
| Ma'lumotlar bazasi egaligi | `docs/DATABASE.md` |

Spring repo lokalda bo'lmasa, `docs/PLAN.md` ni GitHub'dan o'qish kifoya.

## Bosqichlar ro'yxati (faqat nomlari)

Holati va tafsiloti — `docs/PLAN.md` da. Bu yerda faqat nomlar, chunki nomlar
o'zgarmaydi, holat esa har bosqichda o'zgaradi.

0. Skeleton
1. Core Spring — `pm-service`
2. Core Spring — `mahalla-service`
3. Xavfsizlik (Spring Security, JWT, Telegram `initData` HMAC filtri)
4. Messaging + async AI (RabbitMQ, Claude Vision chaqiruvini offload qilish)
5. Saga #1 — `CityReport` → `MaintenanceRequest`
6. Gateway + Resilience4j
7. Observability (Actuator, Micrometer, Prometheus, Grafana, tracing, Loki)
8. Caching (Caffeine, Redis) + memory leak mashqi
9. Testing (JUnit 5, Mockito, Testcontainers)
10. `sales-service` + Saga #2
11. Deploy (Dockerfile, compose)

## Bu repo o'sha loyihada nima uchun kerak

Laravel ilovasi — **xatti-harakat etaloni**, almashtiriladigan narsa emas. Endpoint yoki
domen qoidasi qanday ishlashi noaniq bo'lsa, javob shu repodan o'qiladi. Ikki muhim
bog'liqlik:

- **Ma'lumotlar bazasi umumiy.** `pm-service` shu ilovaning `proptech` bazasiga
  ulanadi (strangler fig). Sxema egasi — Laravel: migratsiyalar shu repoda qoladi,
  Liquibase o'sha jadvallarni faqat baseline sifatida qayd qiladi va hech qachon
  o'zgartirmaydi. Tafsilot — Spring repo'dagi `docs/DATABASE.md`.
- **Postgres konteyner shu repodan ko'tariladi** (`docker compose up -d db`,
  konteyner nomi `proptech_db`, host porti 5432). Spring repo'dagi `pm-db` (5433)
  hozircha ishlatilmaydi.
