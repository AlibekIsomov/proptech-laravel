# Demo skript — "Eslab qoladigan tizim"

> Maqsad: 5 daqiqada ko'rsatish — ariza kiradi, AI work order yozadi, tizim
> to'g'ri ustani tanlaydi, va eng muhimi: **takror buzilishni tizim o'zi payqaydi**.
> Hech kim shikoyat yozmaydi — tizim kuzatib o'rganadi.

## Tayyorgarlik (sahnadan oldin, bir marta)

1. Baza to'la bo'lsin: `php artisan migrate --force && php artisan db:seed --force`
   (idempotent — qayta ishga tushirish xavfsiz; demo kompaniya: `demo-seed`).
2. `composer dev` ishga tushgan bo'lsin (queue:listen AI job'larni bajaradi).
3. `ANTHROPIC_API_KEY` `.env`da bo'lsin (bo'lmasa AI mock rejimda — demo baribir ishlaydi).
4. Login: `admin@proptech.uz / password` → PM portal.
5. **Video yozib qo'ying** — sahnada internet o'chsa, video ishlaydi.

## Sahna 1 — Muammo keladi (1 daqiqa)

Telefonda resident Mini App (yoki bot): foto + 2 ta tap — kategoriya, muhimlik.
"Yashovchi hech qanday blanka to'ldirmadi. Shu — butun jarayon."

## Sahna 2 — AI work order yozadi (1 daqiqa)

PM portal → Arizalar. Yangi ariza ustiga bosing — AI panelida:
kategoriya, muhimlik, **nima buzilgan, kerakli ehtiyot qismlar, taxminiy narx**.
"Buni hech kim yozmadi. AI fotoga qarab yozdi. Menejer faqat 'ha' deydi."

## Sahna 3 — Tizim ustani tanlaydi (1 daqiqa)

Usta biriktirish oynasini oching. Ro'yxat shunchaki alifbo emas:
mos mutaxassislik + **reyting bo'yicha**, eng yaxshisi ★ bilan oldindan tanlangan.
"Eng arzoni emas — ta'miri qaytib kelmaydigani birinchi turibdi."

Vendors sahifasi: Karim aka 2.79 → so'rang: "Nega past? Hech kim shikoyat yozmagan-ku."

## Sahna 4 — Asosiy hikoya: takror (2 daqiqa)

Arizalar ro'yxatida 🔁 **Takror** belgisi bor arizani oching:
"6 hafta oldin shu kvartirada shu quvurni Karim aka tuzatgan edi. Yana oqdi.
Tizim buni **o'zi payqadi**: arizani eskisiga bog'ladi, Karim akaning reytingini tushirdi.
Keyingi favqulodda holatda u endi birinchi qatorda emas."

"Har bir boshqaruv kompaniyasi bir xil ta'mirga ikki marta pul to'laydi va buni bilmaydi —
chunki hech kim sanamayapti. Biz sanayapmiz. Bu bilim har oy qimmatlashib boradi,
raqobatchi nusxasi esa noldan boshlaydi."

## Bonus (vaqt qolsa)

- Mahalla Fix xaritasi: 95 murojaat, AI foto tahlili bilan.
- Billing/kommunal: 12 oylik to'liq tarix.

## Agar biror narsa ishlamasa

- AI javob bermasa: mock rejim baribir JSON qaytaradi — davom etavering.
- Internet yo'q: yozib olingan video.
- Savol: "Ustalar botdan foydalanmasa-chi?" — javob: qabul qilish 2 tap ("▶️ Boshlash", "✅ Bajarildi"), telefonda Telegram bor — o'rganish kerak emas.
