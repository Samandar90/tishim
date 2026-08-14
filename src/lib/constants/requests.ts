/**
 * Локаленезависимый маркер заявки от клиники. Пишется в mapping_requests.comment,
 * а в интерфейсе рендерится переведённым бейджем (requests.clinicTag), чтобы
 * узбекоязычный админ не видел русскую метку из БД.
 */
export const CLINIC_REQUEST_TAG = "[CLINIC]";
