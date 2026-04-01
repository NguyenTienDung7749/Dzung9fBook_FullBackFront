export const ORDER_STATUS_LABELS = {
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất'
};

export const PAYMENT_STATUS_LABELS = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  VOID: 'Vô hiệu'
};

export const formatOrderDateTime = function (value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Không rõ thời gian';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsedDate);
};

export const resolveOrderStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return ORDER_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Đang xử lý';
};

export const resolvePaymentStatusLabel = function (status) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  return PAYMENT_STATUS_LABELS[normalizedStatus] || normalizedStatus || 'Không rõ';
};

export const canCancelOrder = function (order) {
  return Boolean(order?.canCancel);
};

export const buildOrderDetailUrl = function (orderId) {
  const normalizedOrderId = String(orderId || '').trim();
  return normalizedOrderId
    ? `./order-detail.html?id=${encodeURIComponent(normalizedOrderId)}`
    : './orders.html';
};
