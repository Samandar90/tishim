/**
 * Текст политики конфиденциальности. Это документ, а не строки интерфейса, поэтому
 * живёт здесь, а не в messages/*.json; язык выбирает страница по cookie locale.
 * Юридическую проверку текст не проходил — редакция меняется вместе с датой в
 * ключе privacy.updated.
 */
export interface PrivacySection {
  title: string;
  paragraphs: string[];
}

export const PRIVACY: Record<"ru" | "uz", PrivacySection[]> = {
  ru: [
    {
      title: "Кто мы и о чём этот документ",
      paragraphs: [
        "Tishim — сервис цифровой стоматологической карты. Этот документ объясняет, какие данные мы получаем, зачем они нужны, где хранятся и как ими управлять. Используя сайт или оставляя заявку, вы соглашаетесь с описанными правилами.",
      ],
    },
    {
      title: "Какие данные мы собираем",
      paragraphs: [
        "При заявке с сайта: имя, номер телефона, желаемая дата и комментарий.",
        "При регистрации: имя, электронная почта, телефон, роль (пациент или стоматолог) и, по желанию, дата рождения.",
        "В карте пациента: записи о состоянии зубов, проведённых процедурах и их стоимости, жалобы, диагнозы, рекомендации, а также фотографии и снимки, которые загружает врач.",
        "При ИИ-проверке фото: загруженные вами фотографии и результат предварительной оценки.",
        "Технические данные: cookie сессии и выбранного языка, адрес и тип устройства в журналах сервера.",
      ],
    },
    {
      title: "Зачем они нужны",
      paragraphs: [
        "Чтобы вести вашу карту и показывать её вам и врачам, которым вы сами открыли доступ; чтобы связаться с вами по заявке; чтобы сервис работал безопасно и без сбоев. Мы не продаём данные и не используем их для сторонней рекламы.",
      ],
    },
    {
      title: "Кто видит вашу карту",
      paragraphs: [
        "Карта принадлежит пациенту. Врач видит её только после того, как пациент назвал ему одноразовый код доступа, и до тех пор, пока пациент не отозвал доступ в разделе «Доступ». Администратор сервиса видит обезличенную статистику и заявки с сайта, но не содержимое карт.",
        "Правила доступа применяются на уровне базы данных для каждого запроса, а не только в интерфейсе.",
      ],
    },
    {
      title: "Где и как хранятся данные",
      paragraphs: [
        "База данных и файлы размещены в инфраструктуре Supabase (центр обработки данных во Франкфурте, Германия), приложение — на Render. Соединения защищены шифрованием, файлы карт доступны только по временным подписанным ссылкам.",
        "Фотографии для ИИ-проверки передаются модели Anthropic Claude для предварительной визуальной оценки; результат не является диагнозом.",
      ],
    },
    {
      title: "Сколько хранятся данные",
      paragraphs: [
        "Карта хранится, пока у вас есть аккаунт. Заявки с сайта хранятся до завершения работы с ними. Журналы сервера хранятся ограниченное время, установленное хостингом.",
      ],
    },
    {
      title: "Ваши права",
      paragraphs: [
        "Вы можете в любой момент посмотреть свою карту, отозвать доступ врача, восстановить пароль по почте, а также запросить выгрузку или удаление данных, написав нам по контактам на главной странице. Удаление аккаунта удаляет карту и связанные файлы.",
      ],
    },
    {
      title: "Cookie",
      paragraphs: [
        "Мы используем только необходимые cookie: сессию входа и выбранный язык. Аналитических и рекламных cookie нет.",
      ],
    },
    {
      title: "Изменения и контакты",
      paragraphs: [
        "Мы можем обновлять этот документ; дата актуальной редакции указана вверху страницы. Вопросы по данным — по телефону, указанному на главной странице.",
      ],
    },
  ],
  uz: [
    {
      title: "Biz kimmiz va bu hujjat nima haqida",
      paragraphs: [
        "Tishim — raqamli stomatologik karta xizmati. Bu hujjat qanday ma'lumotlarni olishimiz, ular nima uchun kerakligi, qayerda saqlanishi va ularni qanday boshqarish mumkinligini tushuntiradi. Saytdan foydalanib yoki ariza qoldirib, siz bu qoidalarga rozilik bildirasiz.",
      ],
    },
    {
      title: "Qanday ma'lumotlarni yig'amiz",
      paragraphs: [
        "Saytdagi arizada: ism, telefon raqami, istalgan sana va izoh.",
        "Ro'yxatdan o'tishda: ism, elektron pochta, telefon, rol (bemor yoki stomatolog) va ixtiyoriy ravishda tug'ilgan sana.",
        "Bemor kartasida: tishlar holati, o'tkazilgan muolajalar va ularning narxi, shikoyatlar, tashxislar, tavsiyalar hamda shifokor yuklagan suratlar va rentgen tasvirlari.",
        "AI tekshiruvida: siz yuklagan suratlar va dastlabki baholash natijasi.",
        "Texnik ma'lumotlar: sessiya va tanlangan til cookie'lari, server jurnallaridagi qurilma manzili va turi.",
      ],
    },
    {
      title: "Ular nima uchun kerak",
      paragraphs: [
        "Kartangizni yuritish va uni sizga hamda siz o'zingiz ruxsat bergan shifokorlarga ko'rsatish uchun; ariza bo'yicha siz bilan bog'lanish uchun; xizmat xavfsiz va uzluksiz ishlashi uchun. Biz ma'lumotlarni sotmaymiz va begona reklama uchun ishlatmaymiz.",
      ],
    },
    {
      title: "Kartangizni kim ko'radi",
      paragraphs: [
        "Karta bemorga tegishli. Shifokor uni faqat bemor unga bir martalik kirish kodini aytgandan keyin va bemor «Kirish» bo'limida ruxsatni bekor qilmaguncha ko'radi. Xizmat administratori faqat umumlashtirilgan statistika va saytdagi arizalarni ko'radi, kartalar mazmunini emas.",
        "Kirish qoidalari faqat interfeysda emas, har bir so'rov uchun ma'lumotlar bazasi darajasida qo'llanadi.",
      ],
    },
    {
      title: "Ma'lumotlar qayerda va qanday saqlanadi",
      paragraphs: [
        "Ma'lumotlar bazasi va fayllar Supabase infratuzilmasida (Frankfurt, Germaniya ma'lumot markazi), ilova esa Render'da joylashgan. Ulanishlar shifrlangan, karta fayllari faqat vaqtinchalik imzolangan havolalar orqali ochiladi.",
        "AI tekshiruvi uchun suratlar dastlabki vizual baholash uchun Anthropic Claude modeliga yuboriladi; natija tashxis emas.",
      ],
    },
    {
      title: "Ma'lumotlar qancha saqlanadi",
      paragraphs: [
        "Karta hisobingiz mavjud ekan saqlanadi. Saytdagi arizalar ular bilan ishlash tugaguncha saqlanadi. Server jurnallari hosting belgilagan cheklangan muddat saqlanadi.",
      ],
    },
    {
      title: "Sizning huquqlaringiz",
      paragraphs: [
        "Siz istalgan vaqtda kartangizni ko'rishingiz, shifokor ruxsatini bekor qilishingiz, parolni pochta orqali tiklashingiz, shuningdek bosh sahifadagi kontaktlar orqali ma'lumotlarni yuklab olish yoki o'chirishni so'rashingiz mumkin. Hisobni o'chirish kartani va bog'liq fayllarni o'chiradi.",
      ],
    },
    {
      title: "Cookie",
      paragraphs: [
        "Biz faqat zarur cookie'lardan foydalanamiz: kirish sessiyasi va tanlangan til. Analitik va reklama cookie'lari yo'q.",
      ],
    },
    {
      title: "O'zgarishlar va kontaktlar",
      paragraphs: [
        "Biz bu hujjatni yangilashimiz mumkin; amaldagi tahrir sanasi sahifa yuqorisida ko'rsatilgan. Ma'lumotlar bo'yicha savollar — bosh sahifada ko'rsatilgan telefon orqali.",
      ],
    },
  ],
};
