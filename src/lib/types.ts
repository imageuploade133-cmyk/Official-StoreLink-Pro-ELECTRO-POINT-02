
import { Timestamp } from 'firebase/firestore';

export type PermissionId =
  | 'view_dashboard'
  | 'view_inventory'
  | 'add_products'
  | 'edit_products'
  | 'delete_products'
  | 'view_categories'
  | 'add_categories'
  | 'edit_categories'
  | 'delete_categories'
  | 'view_staff'
  | 'manage_staff'
  | 'view_permissions'
  | 'view_settings'
  | 'manage_settings'
  | 'manage_coupons'
  | 'manage_website_content'
  | 'canViewCustomers'
  | 'canAddCustomers'
  | 'canEditCustomers'
  | 'canDeleteCustomers'
  | 'canPrintBarcodes'
  | 'view_stock_alerts'
  | 'transfer_stock'
  | 'canBulkRestock'
  | 'canAccessPOS'
  | 'view_my_sales'
  | 'view_sales_history'
  | 'canViewProductSales'
  | 'canManageExpenses'
  | 'canBulkAddProducts'
  | 'canProcessReturns'
  | 'canSendMarketingWhatsapp'
  | 'manage_orders'
  | 'view_online_customers'
  | 'manage_flexible_payments'
  | 'view_stock_audit'
  | 'manage_ads';

export interface Permission {
  id: PermissionId;
  name: string;
  description: string;
  module: 'Dashboard' | 'Inventory' | 'Categories' | 'Staff & Permissions' | 'Settings' | 'Customers' | 'POS' | 'Reports' | 'Marketing' | 'Website' | 'Orders' | 'Financials';
}

export interface Role {
  id: string; // admin, manager, cashier, etc.
  name: string;
  description: string;
  permissions: PermissionId[];
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  deliveryAddress?: string;
  alternativePhoneNumber?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface SocialMediaLink {
  id: string;
  name: string;
  url: string;
  iconUrl?: string;
}

export interface BrandValue {
  icon: string;
  title: string;
  description: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  logoUrl?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  usageCount: number;
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  createdAt?: Timestamp;
}

export interface Settings {
  id: string; // 'global'
  theme?: 'light' | 'dark' | 'system';
  currency: string;
  country?: string;
  countryCode?: string;
  colorPrimary?: string;
  colorBackground?: string;
  colorDestructive?: string;
  colorSuccess?: string;
  backgroundStyle?: 'solid' | 'gradient' | 'image' | 'video';
  backgroundImageUrl?: string;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundVideoUrl?: string;
  backgroundVideoImageUrl?: string;
  preventManualStockReduction?: boolean;
  defaultProductImageUrl?: string;
  defaultProfileImageUrl?: string;
  lowStockThreshold?: number;
  disablePriceModification?: boolean;
  enableWhatsapp?: boolean;
  whatsappSaleReceiptHeading?: string;
  whatsappCreditReceiptHeading?: string;
  whatsappGreeting?: string;
  whatsappReceiptFooter?: string;
  creditPaymentInstructions?: string;
  storeName?: string;
  paymentMethods?: PaymentMethod[];
  bankAccounts?: BankAccount[];
  bankTransferInstructions?: string;
  socialMediaLinks?: SocialMediaLink[];
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  footerDescription?: string;
  showFooterDescription?: boolean;
  footerLogoUrl?: string;
  footerLogoWidth?: number;
  enableExternalPrinter?: boolean;
  receiptFooterMessage?: string;
  storeLogoUrl?: string;
  invoiceLogoUrl?: string;
  storeLogoWidth?: number;
  footerLogoWidth?: number;
  storeNameFontSize?: number;
  loginImageUrl?: string;
  invoiceAccentColor?: string;
  invoiceFooterText?: string;
  invoiceBankDetails?: string;
  invoiceEnableTextWatermark?: boolean;
  invoiceWatermarkText?: string;
  invoiceWatermarkColor?: string;
  invoiceWatermarkOpacity?: number;
  invoiceWatermarkFontSize?: number;
  invoiceWatermarkFontSizeMb?: number;
  invoiceWatermarkRotation?: number;
  invoiceStampUrl?: string;
  invoiceSignatureUrl?: string;
  invoiceSignatureLabel?: string;
  invoiceTopBannerUrl?: string;
  invoiceShowTopBanner?: boolean;
  invoiceBackgroundUrl?: string;
  invoiceShowBackground?: boolean;
  invoiceHideStoreInfo?: boolean;
  invoiceWatermarkType?: 'text' | 'image';
  invoiceWatermarkImageUrl?: string;
  invoiceWatermarkImageWidth?: number;
  invoiceHideStamp?: boolean;
  invoiceHideSignature?: boolean;
  invoiceHideBankDetails?: boolean;
  allowStockDeduction?: boolean;
  enableLowStockAlerts?: boolean;
  lowStockAlertPhoneNumber?: string;
  lowStockAlertMessage?: string;
  outOfStockAlertMessage?: string;
  enableSms?: boolean;
  smsSenderId?: string;
  smsWebhookUrl?: string;
  whatsappWebhookUrl?: string;
  whatsappMarketingGreeting?: string;
  whatsappMarketingFooter?: string;
  imgbbApiKey?: string;
  eBulkUsername?: string;
  eBulkApiKey?: string;
  brandValues?: BrandValue[];
  brandValuesBackgroundColor?: string;
  showBrandValues?: boolean;
  showNewsletterSection?: boolean;
  newsletterSectionTitle?: string;
  newsletterSectionDescription?: string;
  newsletterSectionBackgroundColor?: string;
  storeAddToCartText?: string;
  storeAddToCartIcon?: string;
  storeAddToCartStyle?: 'standard' | 'gradient' | 'outline' | 'ghost';
  storeAddToCartColor?: string;
  storeAddToCartGradientStart?: string;
  storeAddToCartGradientEnd?: string;
  storeAddToCartShape?: string;
  storeAddToCartSize?: 'sm' | 'md' | 'lg' | 'xl';
  storeGridCartText?: string;
  storeGridCartIcon?: string;
  storeGridCartStyle?: 'standard' | 'gradient' | 'outline' | 'ghost';
  storeGridCartColor?: string;
  storeGridCartGradientStart?: string;
  storeGridCartGradientEnd?: string;
  storeGridCartShape?: string;
  storeGridCartSize?: 'sm' | 'md' | 'lg' | 'xl';
  storeHeroBtnText?: string;
  storeHeroBtnIcon?: string;
  storeHeroBtnStyle?: 'standard' | 'gradient' | 'outline' | 'ghost';
  storeHeroBtnColor?: string;
  storeHeroBtnGradientStart?: string;
  storeHeroBtnGradientEnd?: string;
  storeHeroBtnShape?: string;
  storeHeroBtnSize?: 'sm' | 'md' | 'lg' | 'xl';
  // Global Store Button Style
  storeBtnStyle?: 'standard' | 'gradient';
  storeBtnColor?: string;
  storeBtnGradientStart?: string;
  storeBtnGradientEnd?: string;
  storeBtnShape?: string;
  storeBtnSize?: 'sm' | 'md' | 'lg' | 'xl';
  // Use individual button settings flag
  useIndividualBtnSettings?: boolean;
  imageUploadQuality?: number;
  imageMaxWidth?: number;
  imageMaxFileSizeMb?: number;
  // Web Watermark
  webWatermarkEnabled?: boolean;
  webWatermarkType?: 'text' | 'image';
  webWatermarkText?: string;
  webWatermarkImageUrl?: string;
  webWatermarkOpacity?: number;
  webWatermarkFontSize?: number;
  webWatermarkImageWidth?: number;
  webWatermarkRotation?: number;
  slideShowDuration?: number;
  // Stock Bar Settings
  showStockBar?: boolean;
  stockBarHealthyLabel?: string;
  stockBarLowLabel?: string;
  stockBarOutLabel?: string;
  stockBarHealthyColor?: string;
  stockBarLowColor?: string;
  stockBarOutColor?: string;
  // Flash Hub Configuration
  flashHubTitle?: string;
  flashHubDescription?: string;
  flashHubBannerImageUrl?: string;
  flashHubBannerVideoUrl?: string;
  flashHubBannerVideoPosterUrl?: string;
  flashHubShowSlideshow?: boolean;
  flashHubColor?: string;
  flashHubIconColor?: string;
  flashHubIconUrl?: string;
  flashHubCornerRadius?: number;
  // Category Section Config
  showCategorySection?: boolean;
  showCategorySectionPreTitle?: boolean;
  categorySectionPreTitle?: string;
  categorySectionTitle?: string;
  categorySectionDescription?: string;
  categorySectionBackgroundColor?: string;
  categorySectionTextColor?: string;
  // Web Layout
  webMaxContainerWidth?: number;
  // Voice Signature Customization
  voiceExperiencePreTitle?: string;
  voiceExperienceTitle?: string;
  voiceExperienceColor?: string;
  voiceExperienceIconUrl?: string;
  // Welcome Bonus Pop-up
  showWelcomePopup?: boolean;
  welcomePopupTitle?: string;
  welcomePopupMessage?: string;
  welcomePopupImageUrl?: string;
  welcomePopupIcon?: string;
  welcomePopupIconColor?: string;
  welcomePopupBgColor?: string;
  welcomePopupTextColor?: string;
  // Logo and Store Name visibility toggles
  showPublicStoreName?: boolean;
  showMainSiteLogo?: boolean;
  // Product Review Settings
  showProductReviews?: boolean;
  showReviewRatingOnCard?: boolean;
  // Web Store Grid Layout Settings
  storeGridColumnsDefault?: 2 | 3;
  storeGridColumnsSm?: 2 | 3;
  storeGridColumnsMd?: 2 | 3 | 4;
  storeGridColumnsLg?: 2 | 3 | 4 | 'custom';
  storeGridColumnsCustom?: number;
  // Product Card Size Settings
  productCardHeight?: number;
  // Product Card Designer Settings
  productCardStyle?: 'default' | 'minimal' | 'classic' | 'modern' | 'custom';
  productCardCustomHtml?: string;
  productCardBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  productCardShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  productCardBorderWidth?: 'none' | 'thin' | 'medium' | 'thick';
  productCardBorderColor?: string;
  productCardBgColor?: string;
  productCardShowImage?: boolean;
  productCardImageRatio?: 'square' | 'portrait' | 'landscape';
  productCardShowBadges?: boolean;
  productCardShowRating?: boolean;
  productCardShowStockBar?: boolean;
  productCardShowWishlist?: boolean;
  productCardShowQuickAdd?: boolean;
  productCardTitleLines?: 1 | 2 | 3;
  productCardTitleAlign?: 'left' | 'center';
  productCardPriceAlign?: 'left' | 'center';
  productCardHoverEffect?: 'none' | 'lift' | 'zoom' | 'glow' | 'border';
  // Global Visibility Settings
  globalShowTechnicalSpecs?: boolean;
  globalShowLogisticsInfo?: boolean;
  globalShowVerifiedReviews?: boolean;
  // Navigation Bar Customization Settings
  navbarStyle?: 'standard' | 'minimal' | 'glass' | 'solid' | 'transparent';
  navbarBackgroundColor?: string;
  navbarTextColor?: string;
  navbarBorderColor?: string;
  navbarHeight?: 'compact' | 'default' | 'expanded' | 'full';
  navbarShowSearch?: boolean;
  navbarShowWishlist?: boolean;
  navbarShowCart?: boolean;
  navbarShowAccount?: boolean;
  navbarShowThemeToggle?: boolean;
  navbarShowCreditBadge?: boolean;
  navbarMenuStyle?: 'dropdown' | 'slide' | 'none';
  navbarShowShopLink?: boolean;
  navbarShowFlashSalesLink?: boolean;
  navbarShowCollectionsLink?: boolean;
  navbarLogoPosition?: 'left' | 'center' | 'right';
  navbarSticky?: 'fixed' | 'sticky' | 'static';
  navbarShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  navbarBlurEffect?: boolean;
  // Product Sharing
  enableProductSharing?: boolean;
  productSharingIcon?: string;
  // Shop Our Collection Settings
  shopBannerImageUrl?: string;
  shopProductsAlignment?: 'left' | 'center';
}

export type AppSettings = Settings;

export interface WebsiteTraffic {
  id: string; // 'global'
  totalViews: number;
  todayViews: number;
  lastDailyUpdate: string;
}

export interface SlideShow {
  id: string;
  placement: 'homepage' | 'flash-hub';
  mediaType: 'image' | 'video';
  pretitle?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  published: boolean;
  order: number;
  showActionButton?: boolean;
  showOverlay?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HomepageSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  published: boolean;
  layout: 'carousel' | 'grid';
  selectionType: 'manual' | 'category' | 'custom-ui';
  alignment?: 'left' | 'center';
  backgroundColor?: string;
  categoryId?: string | null;
  productIds?: string[] | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Flash Sale Extensions
  isFlashSale?: boolean;
  flashSaleDiscountType?: 'percentage' | 'fixed';
  flashSaleDiscountValue?: number;
  flashSaleStartDate?: Timestamp | null;
  flashSaleEndDate?: Timestamp | null;
  // Custom UI Extensions
  uiType?: 'image' | 'html';
  htmlContent?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  fullWidth?: boolean;
  height?: number;
  textColor?: string;
}


export interface Promo {
  type: 'percentage' | 'fixed';
  value: number;
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  createdAt?: Timestamp;
  description?: string;
  imageUrl?: string;
  dataAiHint?: string;
  allowIndividualProductSales?: boolean;
  // Flash Sale Extensions
  isFlashSale?: boolean;
  flashSaleDiscountType?: 'percentage' | 'fixed';
  flashSaleDiscountValue?: number;
  flashSaleStartDate?: Timestamp | null;
  flashSaleEndDate?: Timestamp | null;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface WhatsInTheBoxItem {
  name: string;
}

export interface VariationItem {
  name: string;
}

export interface ProductVideo {
  id: string;
  type: 'direct' | 'youtube' | 'facebook' | 'tiktok';
  url: string;
  title?: string;
}

export interface VoiceSignature {
  id: string;
  audioDataUri: string; // Stored directly in Firestore as 'code' or as a URL
  title: string;
  isVisible: boolean;
  mode?: 'mic' | 'link';
}

export interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  newPrice?: number | null;
  purchasePrice: number;
  stock: number;
  categoryId: string | null;
  sku?: string;
  lowStockThreshold?: number;
  isVisibleInPOS: boolean;
  isVisibleOnWeb: boolean;
  isOfficialBrand?: boolean;
  isNewArrival?: boolean;
  isPopular?: boolean;
  isOldStock?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  barcode?: string;
  descriptionTitle?: string;
  descriptionIcon?: string;
  description?: string;
  expiryDate?: Timestamp | null;
  supplierName?: string;
  imageUrl?: string;
  additionalImageUrls?: string[];
  dataAiHint?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  videoEnabled?: boolean;
  voiceEnabled?: boolean;
  videos?: ProductVideo[];
  videosTitle?: string;
  videosDescription?: string;
  specificationsTitle?: string;
  whatsInTheBoxTitle?: string;
  variationsTitle?: string;
  sizeGuideImageUrl?: string;
  audioDataUri?: string;
  voiceSignatures?: VoiceSignature[];
  promo?: Promo | null;
  allowPriceModification?: boolean;
  barcodeGenerated?: boolean;
  categoryName?: string;
  specifications?: ProductSpecification[];
  whatsInTheBox?: WhatsInTheBoxItem[];
  variations?: VariationItem[];
  badge1Enabled?: boolean;
  badge1Icon?: string;
  badge1Title?: string;
  badge1Sub?: string;
  badge2Enabled?: boolean;
  badge2Icon?: string;
  badge2Title?: string;
  badge2Sub?: string;
  showProductInsight?: boolean;
  showTechnicalSpecs?: boolean;
  showLogisticsInfo?: boolean;
  showVerifiedReviews?: boolean;
  rewardAdsEnabled?: boolean;
}

export interface DisplayProduct extends Product {
  allowPriceModification: boolean;
}

export interface CartItem extends DisplayProduct {
  quantity: number;
  salePrice: number;
}

export type StoreCartItem = Product & {
  quantity: number;
  salePrice: number; // Price at the time of adding to cart
};

export interface BarcodeProduct extends Product {
  isSelected: boolean;
  labelQuantity: number;
}

export interface RestockEntry {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    costPricePerUnit: number;
    totalCost: number;
    supplierName?: string | null;
    notes?: string | null;
    restockDate: Timestamp;
    createdAt: Timestamp;
    userEmail: string;
}

export type ProductForRestockForm = Pick<Product, 'id' | 'name' | 'sku' | 'barcode' | 'stock' | 'purchasePrice' | 'sellingPrice'>;
export type StockAlertItem = Product;


export interface StaffMember {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // Should match one of the role ids
  status: 'Active' | 'Inactive';
  permissions: {
    pages: PermissionId[];
  };
  avatar?: string;
  totalSales?: number;
  totalTransactions?: number;
  todaySales?: number;
}

export interface SaleTransaction {
    id: string;
    staffId: string;
    createdAt: Timestamp;
    grandTotal: number;
    returnedAmount?: number;
    items: SaleTransactionItem[];
    subtotal: number;
    paymentMethod: string;
    updatedAt: Timestamp;
    discountValue?: number | null;
    discountType?: 'percentage' | 'fixed' | null;
    discountAmountCalculated?: number | null;
    taxRate?: number | null;
    taxAmountCalculated?: number | null;
    paymentDetails?: PaymentDetails | null;
    notes?: string | null;
    isPaid?: boolean;
    isCreditSale?: boolean;
    customerName?: string | null;
    customerId?: string | null;
    dueDate?: Timestamp | null;
    amountPaidTowardsCredit?: number;
    paymentHistory: PaymentRecord[];
    oldBalanceAtTimeOfSale?: number | null;
    newBalanceAtTimeOfSale?: number | null;
    depositBalanceAtTimeOfSale?: number | null;
    hadOutstandingBalanceAtTimeOfSale?: boolean | null;
    initialPaymentMadeAtTimeOfSale?: number | null;
    creditSaleSettlementStatus?: CreditSaleSettlementStatus | null;
    reprintCount: number;
    returnStatus?: 'fullyReturned' | 'partiallyReturned' | null;
    returns?: SaleReturn[];
    amountTenderedAtTimeOfSale?: number;
    changeGivenAtTimeOfSale?: number;
}


export type CreditPaymentRecord = {
    paymentDate: Timestamp;
    amountPaid: number;
    paymentMethod: string;
    notes?: string | null;
};

export type CustomerStatus = 'active' | 'inactive' | 'banned';

export interface Customer {
  id: string;
  uid?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  country?: string;
  status: CustomerStatus;
  totalSpent: number;
  outstandingCredit: number;
  creditBalance: number; // For deposits / overpayments
  allowSms: boolean;
  allowUsername?: string;
  allowWhatsapp: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalCreditPaid?: number;
}

export interface CustomerHistory {
    id: string;
    customerId: string;
    customerName: string;
    action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_UPDATE" | "PAYMENT" | "SALE";
    timestamp: Timestamp;
    userId: string;
    userName: string;
    details: string;
    beforeData?: Partial<Customer>;
    afterData?: Partial<Customer>;
}

export interface HeldSaleItem {
    id: string;
    name: string;
    sellingPrice: number;
    quantity: number;
    imageUrl: string | null;
    dataAiHint: string | null;
    stock: number;
    barcode: string | null;
    categoryId: string | null;
}

export interface HeldSale {
    id: string;
    items: HeldSaleItem[];
    totalAmount: number;
    notes: string | null;
    customerIdentifier: string | null;
    heldAt: Timestamp;
}

export interface SplitPayment {
    method: string;
    amount: number;
}

export interface PaymentDetails {
    methods?: SplitPayment[];
    cardLast4?: string;
    transferRef?: string;
    amountTendered?: number;
    changeGiven?: number;
}

export interface ActivityLog {
    id: string;
    timestamp: Timestamp;
    userId: string;
    userName: string;
    actionType: 'SALE_COMPLETED' | 'SALE_HELD' | 'HELD_SALE_RESTORED' | 'HELD_SALE_DELETED' | 'CART_CLEARED' | 'LOGIN' | 'LOGOUT' | 'BULK_IMPORT' | 'SALE_ITEMS_RETURNED';
    entityType: 'SaleTransaction' | 'Held Sale' | 'Cart' | 'User' | 'Product';
    entityId: string;
    summary: string;
    entityDescription: string;
    details: Record<string, any>;
}
export interface PaymentRecord {
    paymentDate: Timestamp;
    amountPaid: number;
    paymentMethod: string;
    notes?: string | null;
}

export type CreditSaleSettlementStatus = 'SETTLED_AT_SALE' | 'PARTIALLY_PAID_AT_SALE' | 'UNPAID_AT_SALE' | 'SETTLED_LATER';

export interface WhatsappPayload {
    eventType: 'sale_paid' | 'sale_credit' | 'stock_alert' | 'custom_message' | 'order_placed' | 'staff_order_alert';
    phone: string;
    saleId?: string;
    orderId?: string;
    items?: { name: string; qty: number; price: number }[];
    subtotal?: number;
    discountAmount?: number;
    total?: number;
    amountPaid?: number;
    changeGiven?: number;
    amountOwing?: number;
    dueDate?: string;
    previousBalance?: number;
    newAccountBalance?: number;
    balanceBefore?: number;
    balanceLeft?: number;
    paymentMethod?: string;
    paymentDetails?: PaymentDetails | null;
    creditPaymentInstructions?: string;
    currencySymbol?: string;
    heading?: string;
    greeting?: string;
    footer?: string;
    storeName?: string;
    customerName: string;
    message?: string;
}

export interface CreditPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: Timestamp;
  paymentMethod: string;
  notes?: string | null;
  staffId: string;
  saleId?: string; // Optional if applied to a specific sale
  isBulkPayment?: boolean;
  isDeposit?: boolean;
  debtSettled?: number;
  creditAdded?: number;
}

export interface WhatsappMessageLog {
    id?: string;
    timestamp: Timestamp;
    eventType: 'sale_paid' | 'sale_credit' | 'stock_alert' | 'custom_message' | 'order_placed' | 'staff_order_alert';
    messageContent: string;
    recipientPhone: string;
    customerName?: string;
    status: 'sent' | 'failed' | 'pending';
    unitsCharged: number;
    errorDetails?: string | null;
    userId: string;
    userName: string;
}

export interface CreditPaymentReceiptInfo {
  id: string;
  storeName: string;
  customerName: string;
  saleIdPaidAgainst: string;
  originalSaleDate: Timestamp;
  items: SaleTransactionItem[];
  paymentRecord: PaymentRecord;
  saleTotalAmount: number;
  saleAmountPreviouslyPaid: number;
  saleRemainingBalance: number;
  customerTotalOutstandingAfterPayment: number;
  reprintCount?: number;
}

export interface PaymentLogData {
  saleId: string;
  customerName: string;
  paymentAmount: number;
  paymentDate: Date;
  oldSaleState: SaleTransaction;
  updatedSaleState: SaleTransaction;
  paymentMethod: string;
}

export interface AggregatedProductSale {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  imageUrl?: string | null;
  dataAiHint?: string | null;
  currentStock: number;
  totalQuantitySold: number;
  totalRevenueGenerated: number;
  totalProfit: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: string;
  expenseDate: Date | Timestamp;
  notes?: string;
  recordedBy: string;
  status: 'Active' | 'Returned';
  useMultipleAccounts?: boolean;
  multiAccountPayments?: { method: string, amount: number }[];
  depositToMethod?: string;
}

export interface Reversal {
  id: string;
  originalExpenseId: string;
  originalExpenseData: Expense;
  reversalDate: Timestamp;
  reversedBy: string;
  reversedByEmail: string;
}

export interface WishlistItem {
  id: string; // This will be the product ID
  productId: string;
  addedAt: Timestamp;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string; // "GUEST" for walking customers
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  totalCost: number;
  paymentMethod: string;
  paymentReference?: string;
  couponCode?: string;
  status: OrderStatus;
  createdAt: Timestamp;
  selectedBankAccount?: BankAccount | null;
  guestInfo?: {
    name: string;
    email: string;
    phone?: string;
    address: string;
  } | null;
}

export interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  rating: number;
  comment: string;
  createdAt: Timestamp;
}

export interface AdLink {
  id: string;
  adLink?: string;
  adScript?: string;
  bannerLocation?: string;
  adType: 'background' | 'reward' | 'banner';
  status: 'active' | 'inactive';
  placement: 'page_visit' | 'click_anywhere' | 'add_to_cart' | 'checkout_start' | 'reward_button' | 'banner';
  frequency: 'once_per_session' | 'every_time';
  frequencyTime?: number; // Added field: frequency time in seconds
  deviceTargeting: 'all' | 'mobile_only' | 'desktop_only';
  rewardDiscountType?: 'percentage' | 'fixed';
  rewardDiscountValue?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  clicks?: number;
  views?: number;
}

export interface SaleTransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalPrice?: number | null;
}

export interface SaleReturn {
  returnedAt: Timestamp;
  staffId: string;
  staffEmail: string;
  reason: string;
  items: SaleTransactionItem[];
  totalReturnedAmount: number;
}

export interface StockAuditEntry {
  id: string;
  productId: string;
  productName: string;
  type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN' | 'MANUAL_EDIT' | 'DELETE';
  referenceId: string;
  beforeStock: number;
  afterStock: number;
  change: number;
  staffId: string;
  staffName: string;
  timestamp: Timestamp;
}
