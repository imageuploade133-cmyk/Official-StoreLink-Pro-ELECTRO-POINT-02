
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

export interface PaymentProvider {
  id: string;
  storeId: string;
  providerName: 'paystack' | 'flutterwave' | 'stripe' | 'paypal' | 'manual' | 'pay_on_delivery' | 'opay' | 'palmpay' | 'nowpayments' | 'monnify' | 'adyen';
  config: string; // JSON string, encrypted
  isActive: boolean;
  mode: 'test' | 'live';
  allowedLocations?: string[];
  paymentRegion?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  id: string;
  storeId: string;
  orderId: string;
  user_id?: string; // Ownership for security rules
  provider: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  customerEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Coupon {
  id: string;
  store_id?: string; // Multi-store support
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  usageCount: number;
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  createdAt?: Timestamp;
}

export interface EmailAlertSettings {
  enabled: boolean;
  provider: "gmail";
  gmailEmail: string;
  gmailAppPassword: string;
  notificationEmail: string;
  senderName: string;
  customerConfirmation: boolean;
  connected: boolean;
  updatedAt: Timestamp;
}

export interface EmailProviderSettings {
  provider: 'brevo' | 'resend' | 'smtp';
  apiKeyEncrypted: string;
  maskedKey: string;
  senderName: string;
  senderEmail: string;
  enabled: boolean;
  updatedAt: Timestamp;
}

export interface WhatsAppAlertSettings {
  enabled: boolean;
  username: string;
  apiKey: string;
  senderNumber?: string;
  orderNotificationNumbers?: string[];
  connected: boolean;
  updatedAt: Timestamp;
  orderPlacedTemplate?: string;
  orderProcessingTemplate?: string;
  orderShippedTemplate?: string;
  orderCancelledTemplate?: string;
  orderDeliveredTemplate?: string;
}

export interface Settings {
  id: string; // 'global'
  theme?: 'light' | 'dark' | 'system';
  currency: string;
  country?: string;
  paymentRegion?: string;
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
  footerBackgroundStyle?: 'solid' | 'gradient';
  footerColorBackground?: string;
  footerBackgroundGradientStart?: string;
  footerBackgroundGradientEnd?: string;
  footerTextColor?: string;
  footerDesign?: 'standard' | 'modern' | 'minimal' | 'apple';
  footerBannerUrl?: string;
  footerBannerSize?: 'small' | 'big' | number;
  footerBgType?: 'text' | 'image' | 'none';
  footerBgText?: string;
  footerBgImageUrl?: string;
  footerBgSize?: number;
  footerBgRotation?: number;
  footerCustomHtml?: string;
  showFooterCustomHtml?: boolean;
  enableExternalPrinter?: boolean;
  receiptFooterMessage?: string;
  storeLogoUrl?: string;
  invoiceLogoUrl?: string;
  storeLogoWidth?: number;
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
  enableEmailAlerts?: boolean;
  orderNotificationEmails?: string[];
  imgbbApiKey?: string;
  eBulkUsername?: string;
  eBulkApiKey?: string;
  brandValues?: BrandValue[];
  brandValuesBackgroundColor?: string;
  brandValuesVerticalPadding?: number;
  brandValuesMaxWidth?: number;
  showBrandValues?: boolean;
  brandValuesEnableZoom?: boolean;
  brandValuesEnableShadow?: boolean;
  showNewsletterSection?: boolean;
  newsletterSectionTitle?: string;
  newsletterSectionDescription?: string;
  newsletterSectionBackgroundColor?: string;
  storeAddToCartText?: string;
  storeAddToCartIcon?: string;
  storeAddToCartStyle?: 'standard' | 'gradient' | 'image' | 'outline' | 'ghost' | 'apple';
  storeAddToCartColor?: string;
  storeAddToCartGradientStart?: string;
  storeAddToCartGradientEnd?: string;
  storeAddToCartImageUrl?: string;
  storeAddToCartShape?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  storeAddToCartSize?: 'sm' | 'md' | 'lg' | 'xl';
  storeAddToCartShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';
  storeGridCartText?: string;
  storeGridCartIcon?: string;
  storeGridCartStyle?: 'standard' | 'gradient' | 'image' | 'outline' | 'ghost' | 'apple';
  storeGridCartColor?: string;
  storeGridCartGradientStart?: string;
  storeGridCartGradientEnd?: string;
  storeGridCartImageUrl?: string;
  storeGridCartShape?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  storeGridCartSize?: 'sm' | 'md' | 'lg' | 'xl';
  storeGridCartShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';
  storeHeroBtnText?: string;
  storeHeroBtnIcon?: string;
  storeHeroBtnStyle?: 'standard' | 'gradient' | 'image' | 'outline' | 'ghost' | 'apple';
  storeHeroBtnColor?: string;
  storeHeroBtnGradientStart?: string;
  storeHeroBtnGradientEnd?: string;
  storeHeroBtnImageUrl?: string;
  storeHeroBtnShape?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  storeHeroBtnSize?: 'sm' | 'md' | 'lg' | 'xl';
  storeHeroBtnShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';
  // Explore Button settings
  storeExploreBtnText?: string;
  storeExploreBtnIcon?: string;
  storeExploreBtnStyle?: 'standard' | 'gradient' | 'image' | 'outline' | 'ghost' | 'apple';
  storeExploreBtnColor?: string;
  storeExploreBtnGradientStart?: string;
  storeExploreBtnGradientEnd?: string;
  storeExploreBtnImageUrl?: string;
  storeExploreBtnShape?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  storeExploreBtnSize?: 'sm' | 'md' | 'lg' | 'xl';
  storeExploreBtnShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';
  // Global Store Button Style
  storeBtnStyle?: 'standard' | 'gradient' | 'apple';
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
  showGlobalSlideShow?: boolean;
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
  // Hover Zoom UI
  enableHoverZoom?: boolean;
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
  shopCollectionTitle?: string;
  shopCollectionDescription?: string;
  // Delivery Settings
  enablePickUp?: boolean;
  enableDelivery?: boolean;
  deliveryLocations?: { id: string, name: string, price: number }[];
  enableBackgroundShadow?: boolean;
  checkoutSuccessRedirectUrl?: string;
  enableTax?: boolean;
  taxName?: string;
  taxRate?: number;
  // Toast Customization
  toastBackgroundColor?: string;
  toastTextColor?: string;
  toastBorderColor?: string;
  toastBorderRadius?: string;
  toastSuccessColor?: string;
  toastErrorColor?: string;
  toastWarningColor?: string;
  toastInfoColor?: string;
  toastPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  toastAnimation?: 'slide' | 'fade' | 'zoom';
  toastUseGradient?: boolean;
  toastGradientStartColor?: string;
  toastGradientEndColor?: string;
  toastGradientAngle?: number;
  showLogisticsOnPublicSite?: boolean;
  logisticsFaq?: { question: string; answer: string }[];
  shippingPolicy?: string;
  returnsPolicy?: string;
  logisticsImageUrl?: string;
  showRelatedProducts?: boolean;
  relatedProductsBackgroundColor?: string;
  relatedProductsTitle?: string;
  relatedProductsDescription?: string;
  plan?: string;
  enableWelcomeCredit?: boolean;
  welcomeCreditAmount?: number;
  store_id?: string;
  enableOrderAlerts?: boolean;
  orderNotificationNumbers?: string[];
  invoiceLogoHeight?: number;
  terminalLogoHeight?: number;
  posProductSize?: 'big' | 'small' | 'custom';
  posCustomColumns?: number;
  enableLogoOnReceipt?: boolean;
  smallReceiptLogoSize?: number;
  smallReceiptStoreNameBold?: boolean;
  smallReceiptStoreAddressBold?: boolean;
  enableLogoOnInvoice?: boolean;
  invoiceWatermarkLogoOpacity?: number;
  invoiceWatermarkLogoPosition?: string;
  invoiceWatermarkLogoSize?: number;
  storeContact?: string;
}

export type AppSettings = Settings;

export interface WebsiteTraffic {
  id: string; // 'global'
  totalViews: number;
  todayViews: number;
  lastDailyUpdate: string;
}

export interface PublicPage {
  id: string;
  store_id?: string;
  title: string;
  slug: string;
  content: string;
  bannerImageUrl?: string;
  isPublished: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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
  selectionType: 'manual' | 'category' | 'custom-ui' | 'all';
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
  uiType?: 'image' | 'html' | 'video';
  htmlContent?: string;
  imageUrl?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
  linkUrl?: string;
  buttonText?: string;
  fullWidth?: boolean;
  height?: number;
  textColor?: string;
  // Carousel Extensions
  autoScroll?: boolean;
  showOverlay?: boolean;
  slideIcon?: 'chevron' | 'arrow' | 'circle';
  slideStyle?: 'default' | 'rounded' | 'square' | 'outline' | 'ghost';
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
  store_id?: string; // Multi-store support
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

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Red / S"
  options: { [key: string]: string }; // e.g., { "Color": "Red", "Size": "S" }
  sku?: string;
  barcode?: string;
  sellingPrice?: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  additionalImageUrls?: string[];
  isActive: boolean;
}

export interface ProductOption {
  name: string; // e.g., "Color"
  values: string[]; // e.g., ["Red", "Black"]
}

export interface Product {
  id: string;
  store_id?: string; // Multi-store support
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
  isUnavailable?: boolean;
  isOutOfStock?: boolean;
  isLowStock?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  barcode?: string;
  descriptionTitle?: string;
  descriptionIcon?: string;
  description?: string;
  expiryDate?: Timestamp | null;
  supplierName?: string;
  supplierBusinessName?: string;
  supplierContactName?: string;
  supplierPhone?: string;
  supplierLocation?: string;
  stockDocumentUrl?: string;
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
  hasVariants?: boolean;
  variants?: ProductVariant[];
  variantOptions?: ProductOption[];
}

export interface DisplayProduct extends Product {
  allowPriceModification: boolean;
}

export interface CartItem extends DisplayProduct {
  quantity: number;
  salePrice: number;
  selectedVariantId?: string;
  selectedOptions?: { [key: string]: string };
}

export type StoreCartItem = Product & {
  quantity: number;
  salePrice: number; // Price at the time of adding to cart
  selectedVariantId?: string;
  selectedOptions?: { [key: string]: string };
};

export interface BarcodeProduct extends Product {
  isSelected: boolean;
  labelQuantity: number;
}

export interface RestockEntry {
    id: string;
    store_id?: string; // Multi-store support
    productId: string;
    productName: string;
    quantity: number;
    costPricePerUnit: number;
    totalCost: number;
    supplierName?: string | null;
    supplierBusinessName?: string | null;
    supplierContactName?: string | null;
    supplierPhone?: string | null;
    supplierLocation?: string | null;
    receiptUrl?: string | null;
    notes?: string | null;
    restockDate: Timestamp;
    createdAt: Timestamp;
    userEmail: string;
}

export type ProductForRestockForm = Pick<Product, 'id' | 'name' | 'sku' | 'barcode' | 'stock' | 'purchasePrice' | 'sellingPrice' | 'hasVariants' | 'variants'>;
export type StockAlertItem = Product;


export interface Store {
  id: string;
  slug?: string;
  owner_id: string;
  name: string;
  address?: string;
  phone?: string;
  databaseId?: string;
  createdAt: Timestamp;
  plan?: 'free' | 'pro' | 'premium';
  customDomain?: string;
  subdomain?: string;
  domainVerificationToken?: string;
  domainVerified?: boolean;
  customDomainActive?: boolean;
  subdomainActive?: boolean;
  domainStatus?: 'pending' | 'active' | 'failed' | 'none';
  domainActivatedAt?: Timestamp;
  primaryDomainType?: 'free' | 'subdomain' | 'custom';
  redirectEnabled?: boolean;
}

export interface StaffMember {
  id: string;
  uid: string;
  store_id?: string; // Added for multi-store support
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
  allowWhatsapp?: boolean;
  allowSms?: boolean;
}

export interface SaleTransaction {
    id: string;
    store_id?: string; // Multi-store support
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
  store_id?: string; // Multi-store support
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
  points?: number;
  allowSms: boolean;
  allowUsername?: string;
  allowWhatsapp: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  totalCreditPaid?: number;
}

export interface CustomerHistory {
    id: string;
    store_id: string;
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
    variantId?: string;
    selectedOptions?: { [key: string]: string };
}

export interface HeldSale {
    id: string;
    store_id: string;
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
    store_id: string;
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
    fulfillmentType?: 'pickup' | 'delivery';
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
    store_id?: string;
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
  store_id?: string; // Multi-store support
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

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'paid' | 'failed';
export type PaymentStatus = 'PAID' | 'UNPAID' | 'PENDING' | 'REFUNDED';

export interface Order {
  id: string;
  user_id: string; // "GUEST" for walking customers
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  totalCost: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentStatus?: PaymentStatus;
  paymentReceiptUrl?: string;
  couponCode?: string;
  status: OrderStatus;
  isPaid: boolean;
  isRead?: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  selectedBankAccount?: BankAccount | null;
  fulfillmentType?: 'pickup' | 'delivery';
  deliveryLocationId?: string | null;
  deliveryPrice?: number;
  guestInfo?: {
    name: string;
    email: string;
    phone?: string;
    address: string;
  } | null;
  payCurrency?: string;
  gateway?: string;
  taxRate?: number;
  taxAmountCalculated?: number;
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
  store_id?: string; // Multi-store support
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
  variantId?: string;
  selectedOptions?: { [key: string]: string };
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
  store_id?: string; // Multi-store support
  productId: string;
  productName: string;
  variantId?: string | null;
  selectedOptions?: { [key: string]: string } | null;
  type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN' | 'MANUAL_EDIT' | 'DELETE';
  referenceId: string;
  beforeStock: number;
  afterStock: number;
  change: number;
  staffId: string;
  staffName: string;
  timestamp: Timestamp;
}

export interface StockTransfer {
  id: string;
  store_id: string;
  productId: string;
  productName: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  transferDate: Timestamp | Date;
  staffId: string;
  notes?: string;
}
