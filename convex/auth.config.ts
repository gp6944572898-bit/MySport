// Конфигурация провайдера токенов для @convex-dev/auth: говорит Convex
// доверять JWT, подписанные ключом JWT_PRIVATE_KEY (переменная окружения
// деплоя), и проверять их по открытому ключу из JWKS. Без этого файла
// создание аккаунта проходит, а финальный шаг — выдача токена сессии —
// ломается молча.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
}
