export type Language = 'en' | 'bn';

export interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

export const translations: Translations = {
  // App General
  appName: {
    en: 'Bazar Hisab',
    bn: 'বাজার হিসাব',
  },
  appTagline: {
    en: 'Keep accurate records of your daily shopping lists and monthly expenses.',
    bn: 'আপনার দৈনিক বাজারের ফর্দ এবং মাসিক খরচের সঠিক হিসাব রাখুন।',
  },
  loginWithGoogle: {
    en: 'Login with Google',
    bn: 'Google দিয়ে লগইন করুন',
  },
  logout: {
    en: 'Logout',
    bn: 'লগআউট',
  },
  loading: {
    en: 'Loading...',
    bn: 'লোড হচ্ছে...',
  },
  
  // Navigation
  dashboard: {
    en: 'Dashboard',
    bn: 'ড্যাশবোর্ড',
  },
  lists: {
    en: 'Lists',
    bn: 'ফর্দ',
  },
  history: {
    en: 'History',
    bn: 'ইতিহাস',
  },
  settings: {
    en: 'Settings',
    bn: 'সেটিং',
  },

  // Dashboard
  totalSpent: {
    en: 'Total Spent',
    bn: 'মোট খরচ',
  },
  monthlyBudget: {
    en: 'Monthly Budget',
    bn: 'মাসিক বাজেট',
  },
  remaining: {
    en: 'Remaining',
    bn: 'অবশিষ্ট',
  },
  budgetTracker: {
    en: 'Budget Tracker',
    bn: 'বাজেট ট্র্যাকার',
  },
  setBudget: {
    en: 'Set Budget',
    bn: 'বাজেট সেট করুন',
  },
  totalBazar: {
    en: 'Total Lists',
    bn: 'মোট বাজার',
  },
  spendingTrend: {
    en: 'Spending Trend',
    bn: 'খরচের প্রবণতা',
  },
  recentBazar: {
    en: 'Recent Lists',
    bn: 'সাম্প্রতিক বাজার',
  },
  viewAll: {
    en: 'View All',
    bn: 'সব দেখুন',
  },
  noData: {
    en: 'No data found',
    bn: 'কোনো তথ্য পাওয়া যায়নি',
  },
  active: {
    en: 'Active',
    bn: 'চলমান',
  },
  completed: {
    en: 'Completed',
    bn: 'শেষ',
  },

  // Lists
  activeLists: {
    en: 'Active Lists',
    bn: 'সক্রিয় ফর্দ',
  },
  previousBazar: {
    en: 'Previous Lists',
    bn: 'আগের বাজার',
  },
  addNewList: {
    en: 'Create New List',
    bn: 'নতুন ফর্দ তৈরি করুন',
  },
  listNamePlaceholder: {
    en: 'List Name (e.g. Weekly Bazar)',
    bn: 'ফর্দের নাম (যেমন: সাপ্তাহিক বাজার)',
  },
  create: {
    en: 'Create',
    bn: 'তৈরি করুন',
  },
  deleteList: {
    en: 'Delete List',
    bn: 'ফর্দ মুছে ফেলুন',
  },
  deleteListConfirm: {
    en: 'Are you sure you want to delete this list?',
    bn: 'আপনি কি নিশ্চিত যে আপনি এই ফর্দটি মুছে ফেলতে চান?',
  },
  success: {
    en: 'Success',
    bn: 'সফল',
  },
  listDeleted: {
    en: 'List deleted successfully.',
    bn: 'ফর্দটি মুছে ফেলা হয়েছে।',
  },
  noListsFound: {
    en: 'No lists found. Create a new one!',
    bn: 'কোনো ফর্দ পাওয়া যায়নি। নতুন একটি তৈরি করুন!',
  },

  // List Detail
  items: {
    en: 'Items',
    bn: 'আইটেম',
  },
  bazarList: {
    en: 'Bazar List',
    bn: 'বাজারের তালিকা',
  },
  addItem: {
    en: 'Add Item',
    bn: 'আইটেম যোগ করুন',
  },
  itemNamePlaceholder: {
    en: 'Item Name (e.g. Rice)',
    bn: 'আইটেমের নাম (যেমন: চাল)',
  },
  quantity: {
    en: 'Quantity',
    bn: 'পরিমাণ',
  },
  unitPrice: {
    en: 'Unit Price',
    bn: 'একক দাম',
  },
  unitPricePlaceholder: {
    en: 'Unit Price (e.g. 160)',
    bn: 'একক দাম (যেমন: ১৬০)',
  },
  totalPriceAuto: {
    en: 'Total Price (Auto):',
    bn: 'মোট দাম (অটো):',
  },
  add: {
    en: 'Add',
    bn: 'যোগ করুন',
  },
  cancel: {
    en: 'Cancel',
    bn: 'বাতিল',
  },
  confirm: {
    en: 'Confirm',
    bn: 'নিশ্চিত করুন',
  },
  ok: {
    en: 'OK',
    bn: 'ঠিক আছে',
  },
  completeBazar: {
    en: 'Complete Bazar',
    bn: 'বাজার সম্পন্ন করুন',
  },
  completeBazarConfirm: {
    en: 'Do you want to complete this bazar?',
    bn: 'আপনি কি এই বাজারটি সম্পন্ন করতে চান?',
  },
  deleteItem: {
    en: 'Delete Item',
    bn: 'আইটেম মুছে ফেলুন',
  },
  deleteItemConfirm: {
    en: 'Are you sure you want to delete this item?',
    bn: 'আপনি কি নিশ্চিত যে আপনি এই আইটেমটি মুছে ফেলতে চান?',
  },
  noItemsInList: {
    en: 'No items in the list.',
    bn: 'তালিকায় কোনো আইটেম নেই।',
  },
  total: {
    en: 'Total:',
    bn: 'মোট:',
  },

  // Settings
  setMonthlyBudget: {
    en: 'Set Monthly Budget',
    bn: 'মাসিক বাজেট নির্ধারণ',
  },
  budgetHelpText: {
    en: 'Set your monthly spending target. This will help you control expenses.',
    bn: 'আপনার মাসিক খরচের লক্ষ্যমাত্রা নির্ধারণ করুন। এটি আপনাকে খরচ নিয়ন্ত্রণে সাহায্য করবে।',
  },
  updateBudget: {
    en: 'Update Budget',
    bn: 'বাজেট আপডেট করুন',
  },
  saving: {
    en: 'Saving...',
    bn: 'সেভ হচ্ছে...',
  },
  budgetSaved: {
    en: 'Budget saved successfully!',
    bn: 'বাজেট সফলভাবে সেভ করা হয়েছে!',
  },
  howToUseMobile: {
    en: 'How to use on Mobile',
    bn: 'মোবাইলে ব্যবহার করার নিয়ম',
  },
  mobileStep1: {
    en: 'Open this website in your phone browser (Chrome or Safari).',
    bn: 'আপনার ফোনের ব্রাউজারে (Chrome বা Safari) এই ওয়েবসাইটটি ওপেন করুন।',
  },
  mobileStep2: {
    en: 'Select "Add to Home Screen" from the browser menu.',
    bn: 'ব্রাউজারের মেনু থেকে "Add to Home Screen" অপশনটি সিলেক্ট করুন।',
  },
  mobileStep3: {
    en: 'Now it will appear as an app on your mobile home screen!',
    bn: 'এখন আপনার মোবাইলের হোম স্ক্রিনে এটি একটি অ্যাপের মতো দেখাবে!',
  },
  account: {
    en: 'Account',
    bn: 'অ্যাকাউন্ট',
  },
  language: {
    en: 'Language',
    bn: 'ভাষা',
  },
  selectLanguage: {
    en: 'Select Language',
    bn: 'ভাষা নির্বাচন করুন',
  },
  versionInfo: {
    en: 'Bazar Hisab v1.2.0 • Made by Basir Uddin',
    bn: 'বাজার হিসাব v১.২.০ • তৈরি করেছেন বসির উদ্দিন',
  },

  // Error Boundary
  somethingWentWrong: {
    en: 'Something went wrong',
    bn: 'কিছু ভুল হয়েছে',
  },
  reloadApp: {
    en: 'Reload Application',
    bn: 'অ্যাপ্লিকেশন রিলোড করুন',
  },

  // Categories
  General: { en: 'General', bn: 'সাধারণ' },
  Vegetables: { en: 'Vegetables', bn: 'সবজি' },
  'Meat/Fish': { en: 'Meat/Fish', bn: 'মাছ/মাংস' },
  Grocery: { en: 'Grocery', bn: 'মুদি' },
  Dairy: { en: 'Dairy', bn: 'দুগ্ধজাত' },
  
  // Units
  kg: { en: 'kg', bn: 'কেজি' },
  gm: { en: 'gm', bn: 'গ্রাম' },
  ltr: { en: 'ltr', bn: 'লিটার' },
  piece: { en: 'piece', bn: 'টি' },
  packet: { en: 'packet', bn: 'প্যাকেট' },
  dozen: { en: 'dozen', bn: 'ডজন' },
};
