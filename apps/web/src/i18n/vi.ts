/** Chuỗi giao diện tiếng Việt, khớp Figma Components (UI Blueprint). */
export const vi = {
  appName: 'Pet Health',
  nav: {
    label: 'Điều hướng chính',
    home: 'Tổng quan',
    health: 'Sức khỏe',
    calendar: 'Lịch',
    pets: 'Thú cưng',
    settings: 'Cài đặt',
  },
  topBar: {
    notifications: 'Thông báo',
    quickAdd: 'Thêm nhanh',
    quickAddLabel: '+ Thêm',
    menu: 'Menu tài khoản',
  },
  error: {
    serverTitle: 'Có lỗi xảy ra',
    serverDescription: 'Vui lòng thử lại sau. Nếu vẫn lỗi, gửi mã bên dưới cho người hỗ trợ.',
    serverToast: 'Có lỗi xảy ra, vui lòng thử lại sau.',
    refLabel: 'Mã',
    copy: 'Sao chép',
    copied: 'Đã sao chép',
    retry: 'Thử lại',
    notFoundTitle: 'Không tìm thấy',
    notFoundDescription: 'Trang hoặc dữ liệu không tồn tại, hoặc không thuộc tài khoản của bạn.',
    backHome: 'Về Tổng quan',
  },
  toast: {
    saved: 'Đã lưu',
    saveFailed: 'Không lưu được. Kiểm tra kết nối rồi thử lại.',
    markedDone: 'Đã đánh dấu thực hiện',
    undo: 'Hoàn tác',
    retry: 'Thử lại',
    close: 'Đóng thông báo',
  },
  dialog: {
    close: 'Đóng',
  },
  empty: {
    firstPetTitle: 'Thêm thú cưng đầu tiên để bắt đầu',
    firstPetDescription: 'Ghi cân nặng, sổ y tế và lịch tiêm cho từng bé.',
    firstPetAction: '+ Thêm thú cưng',
  },
  loading: 'Đang tải',
} as const;
