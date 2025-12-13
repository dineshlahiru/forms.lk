import type { Form } from '../types';

// Sample forms have been cleared - only user's localStorage forms are used now
// Type definitions and form labels are preserved for form filling pages

// Passport Application Form - Multi-language support
export interface PassportFormData {
  // Type of Service & Document
  serviceType: 'normal' | 'oneDay' | '';
  documentType: 'allCountries' | 'middleEast' | 'emergencyCertificate' | 'identityCertificate' | '';
  presentTravelDocNo: string;
  nmrpNo: string;

  // Personal Information
  nicNo: string;
  surname: string;
  otherNames: string;
  permanentAddress: string;
  district: string;
  dateOfBirth: { date: string; month: string; year: string };
  birthCertNo: string;
  birthCertDistrict: string;
  placeOfBirth: string;
  sex: 'female' | 'male' | '';
  profession: string;

  // Dual Citizenship
  hasDualCitizenship: 'yes' | 'no' | '';
  dualCitizenshipNo: string;
  foreignNationality: string;
  foreignPassportNo: string;

  // Contact
  mobileNo: string;
  email: string;

  // Child Applicant (below 16 years)
  fatherGuardianNicOrPassport: string;
  motherGuardianNicOrPassport: string;

  // Declaration
  declarationDate: string;
}

export const passportFormLabels = {
  en: {
    title: 'Department of Immigration and Emigration',
    subtitle: 'Sri Lankan Identity Overseas',
    formTitle: 'Application for a Sri Lankan Passport, Emergency/Identity Certificate',
    formNote: 'The data and information are fed into the computer in English. Hence the application must be filled in English.',
    officialUseOnly: 'For Official use only',
    applicationNo: 'Application No.',
    allocatedPassportNo: 'Allocated Passport No.',
    acCode: 'AC Code',
    typeOfService: 'Type of Service',
    normal: 'Normal',
    oneDay: 'One Day',
    typeOfTravelDocument: 'Type of Travel Document',
    allCountries: 'All Countries',
    middleEastCountries: 'Middle East Countries',
    emergencyCertificate: 'Emergency Certificate',
    identityCertificate: 'Identity Certificate',
    presentTravelDocNo: 'Present Travel Document No. (If any)',
    nmrpNo: 'NMRP No. (If any)',
    nicNo: 'National Identity Card No.',
    surname: 'Surname',
    otherNames: 'Other Names',
    permanentAddress: 'Permanent Address',
    district: 'District',
    dateOfBirth: 'Date of Birth',
    date: 'Date',
    month: 'Month',
    year: 'Year',
    birthCertificate: 'Birth Certificate',
    no: 'No.',
    placeOfBirth: 'Place of Birth',
    sex: 'Sex',
    female: 'Female',
    male: 'Male',
    profession: 'Profession/ Occupation/ Job',
    dualCitizenship: 'Have you obtained Dual Citizenship in Sri Lanka?',
    yes: 'Yes',
    dualCitizenshipNo: 'Dual Citizenship No.',
    fillFields17And18: 'Please fill up fields 17 and 18 in the next page',
    mobileNo: 'Mobile/ Phone No.',
    smsNotification: 'to be notified via SMS when passport is ready for collection',
    emailAddress: 'E-mail Address',
    compulsoryForDualCitizenship: 'Compulsory for Dual Citizenship Holders',
    foreignNationality: 'Foreign Nationality',
    foreignPassportNo: 'Foreign Passport No.',
    childBelow16: 'If this application is for a child below the age of 16 years, following information must also be provided.',
    fatherGuardian: 'Father / Guardian',
    motherGuardian: 'Mother / Guardian',
    nicOrTravelDocNo: 'National Identity Card No. / Present Travel Document No.',
    signatureInstruction: 'Applicant, Please place your signature inside both cages below. Signature should not touch the border.',
    declaration: 'Declaration of the Applicant',
    declarationText: 'I declare that I am a citizen of Sri Lanka and the above information provided by me and the documents attached hereto are true and correct. Also, I am aware of the fact that producing forged/ falsified documents and information is a punishable offence.',
    signatureOfApplicant: 'Signature of the Applicant',
  },
};

// National Disaster Relief Form - Multi-language support
export interface DisasterFormData {
  division: string;
  gramaNiladhariDivision: string;
  headOfHouseholdName: string;
  addressLine1: string;
  addressLine2: string;
  identityCardNumber: string;
  phoneNumber: string;
  disasterType: 'flood' | 'landslide' | 'cyclone' | 'other' | '';
  floodSubmerged: { house: boolean; kitchen: boolean };
  disasterAffectedDays: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  houseOwnership: 'owner' | 'rent' | 'estates' | 'unauthorized' | 'other' | '';
  signatureDate: string;
}

export const disasterFormLabels = {
  en: {
    title: 'National Disaster Relief Services Centre',
    subtitle: 'Application for grants for the rehabilitation of houses in the',
    subtitle2: 'District affected by the 2025 "Ditwah" cyclone and floods',
    division: 'Division',
    gramaNiladhariDivision: 'Grama Niladhari Division',
    headOfHouseholdName: 'Name of the head of household',
    address: 'Address',
    addressNote: '(At the place of the Disaster)',
    identityCardNumber: 'Identity card number',
    phoneNumber: 'Phone number',
    disaster: 'Disaster',
    flood: 'Flood',
    landslide: 'Landslide',
    cyclone: 'Cyclone',
    other: 'Other',
    floodSubmerged: 'If it was a flood disaster, it was submerged.',
    house: 'House',
    kitchen: 'Kitchen',
    disasterAffectedDays: 'Disaster affected days',
    bankInfo: 'If the head of household has a bank account,',
    bankName: 'Bank name',
    branch: 'Branch',
    accountNumber: 'Account number',
    houseOwnership: 'Ownership of the House',
    owner: 'The owner',
    rent: 'Rent',
    estates: 'Estates',
    unauthorized: 'Unauthorized',
    certification: 'I certify that the above information is correct.',
    signature: 'the signature',
    date: 'Date',
    officeUseOnly: '(For office use only)',
    committeeApproval: 'Committee approval',
  },
  ta: {
    title: 'தேசிய அனர்த்த நிவாரண சேவைகள் நிலையம்',
    subtitle: '"டித்வா" புயல் மற்றும் வெள்ளத்தால் பாதிக்கப்பட்ட',
    subtitle2: 'மாவட்டத்தில் வீடு மறுசீரமைக்க கொடுப்பனவு பெறுவதற்கான விண்ணப்பப் படிவம்-2025',
    division: 'பி. செ. பிரிவு',
    gramaNiladhariDivision: 'கிராம அலுவலர் பிரிவு',
    headOfHouseholdName: 'வீட்டுத் தலைவரின் பெயர்',
    address: 'முகவரி',
    addressNote: '(அனர்த்தம் ஏற்பட்ட இடத்தின்)',
    identityCardNumber: 'அடையாள இலக்கம்',
    phoneNumber: 'தொலைபேசி இலக்கம்',
    disaster: 'அனர்த்தம்',
    flood: 'வெள்ளம்',
    landslide: 'நிலச்சரிவு',
    cyclone: 'சுழல் காற்று',
    other: 'ஏனையவை',
    floodSubmerged: 'வெள்ளம் எனில் அதில் மூழ்கியவை',
    house: 'வீடு',
    kitchen: 'சமையலறை',
    disasterAffectedDays: 'அனர்த்தம் ஏற்பட்ட திகதி',
    bankInfo: 'வீட்டுத் தலைமைக்கு வங்கிக் கணக்கு இருந்தால்',
    bankName: 'வங்கியின் பெயர்',
    branch: 'கிளை',
    accountNumber: 'கணக்கு இலக்கம்',
    houseOwnership: 'விண்ணப்பதாரருக்கு வீட்டில் உரிமை',
    owner: 'உரிமையாளர்',
    rent: 'வாடகை',
    estates: 'தோட்டங்கள்',
    unauthorized: 'அங்கீகரிக்கப்படாதது',
    certification: 'மேலே உள்ள தகவல்கள் சரியானவை என உறுதி செய்கிறேன்.',
    signature: 'கையொப்பம்',
    date: 'திகதி',
    officeUseOnly: '(அலுவலக பயன்பாட்டிற்கு மட்டும்)',
    committeeApproval: 'குழு அனுமதி',
  },
  si: {
    title: 'ජාතික ආපදා සහන සේවා මධ්‍යස්ථානය',
    subtitle: '2025 "දිට්වා" සුළි කුණාටුව හා ගං වතුරෙන් පීඩාවට පත් වූ',
    subtitle2: 'දිස්ත්‍රික්කයේ නිවාස යථාවත් කර ගැනීම සඳහා දීමනා ලබා ගැනීමේ අයදුම්පත්‍රය',
    division: 'ප්‍රා.ලේ. කොට්ඨාසය',
    gramaNiladhariDivision: 'ග්‍රාම නිලධාරී වසම',
    headOfHouseholdName: 'ගෘහ මූලිකයාගේ නම',
    address: 'ලිපිනය',
    addressNote: '(ආපදාවට පත් වූ ස්ථානයේ)',
    identityCardNumber: 'හැඳුනුම්පත් අංකය',
    phoneNumber: 'දුරකතන අංකය',
    disaster: 'ආපදාව',
    flood: 'ගං වතුර',
    landslide: 'නාය යෑම්',
    cyclone: 'සුළි සුළං',
    other: 'වෙනත්',
    floodSubmerged: 'ගං වතුර ආපදාවක් නම් ජලයෙන් යට වූයේ',
    house: 'නිවස',
    kitchen: 'මුළුතැන්ගෙය',
    disasterAffectedDays: 'ආපදාව බලපැවැත්වූ කාල සීමාව',
    bankInfo: 'ගෘහ මූලිකයාගේ බැංකු ගිණුමක් ඇත්නම්,',
    bankName: 'බැංකුවේ නම',
    branch: 'ශාඛාව',
    accountNumber: 'ගිණුම් අංකය',
    houseOwnership: 'අයදුම්කරුට නිවසට ඇති අයිතිය',
    owner: 'අයිතිකරු',
    rent: 'කුලී',
    estates: 'වතු',
    unauthorized: 'අනවසර',
    certification: 'ඉහත තොරතුරු නිවැරදි බව සහතික කරමි.',
    signature: 'අත්සන',
    date: 'දිනය',
    officeUseOnly: '(කාර්යාල ප්‍රයෝජනය සඳහා පමණි)',
    committeeApproval: 'කමිටු අනුමැතිය',
  },
};

// Police Clearance Application Form - Multi-language support
export interface PoliceClearanceFormData {
  nameInFull: string;
  nameWithInitials: string;
  nicNo: string;
  embassyReferenceNo: string;
  passportNo: string;
  nationality: string;
  dateOfBirth: string;
  sex: 'male' | 'female' | '';
  occupation: string;
  purpose: string;
  civilStatus: 'married' | 'unmarried' | 'divorced' | 'widowed' | '';
  previousApplications: 'yes' | 'no' | '';
  previousApplicationDetails: string;
  addressSriLanka: string;
  policeDivisionSL: string;
  gnDivisionSL: string;
  dsDivisionSL: string;
  periodOfResidenceSL: string;
  addressOverseas: string;
  countryOverseas: string;
  periodOfResidenceOverseas: string;
  additionalAddresses: Array<{
    address: string;
    policeDivision: string;
    gnDivision: string;
    dsDivision: string;
    periodOfResidence: string;
  }>;
  authorizedPerson: string;
  embassyAddress: string;
  mailingAddress: string;
  contactPhone: string;
  email: string;
  spouseNicNo: string;
  spouseName: string;
  spouseAddress: string;
  spousePoliceDivision: string;
  spouseGnDivision: string;
  spouseDsDivision: string;
  declarationDate: string;
  declarationPlace: string;
}

export const policeClearanceFormLabels = {
  en: {
    title: 'Embassy of Sri Lanka',
    subtitle: 'Application for Police Clearance Certificate',
    formNote: 'Please fill in BLOCK CAPITALS using black or blue ink',
    officialUseOnly: 'For Official Use Only',
    nameInFull: 'Name in Full',
    nameWithInitials: 'Name with Initials',
    nicNo: 'National Identity Card No.',
    embassyReferenceNo: 'Embassy Reference No.',
    passportNo: 'Passport No.',
    nationality: 'Nationality',
    dateOfBirth: 'Date of Birth',
    sex: 'Sex',
    male: 'Male',
    female: 'Female',
    occupation: 'Occupation',
    purpose: 'Purpose of Applying for Police Clearance',
    civilStatus: 'Civil Status',
    married: 'Married',
    unmarried: 'Unmarried',
    divorced: 'Divorced',
    widowed: 'Widowed',
    previousApplications: 'Have you previously applied for Police Clearance?',
    yes: 'Yes',
    no: 'No',
    previousApplicationDetails: 'If yes, provide details (Date, Reference No.)',
    addressInSriLanka: 'Address in Sri Lanka',
    addressSriLankaLabel: 'Full Address',
    policeDivision: 'Police Division',
    gnDivision: 'Grama Niladhari Division',
    dsDivision: 'Divisional Secretariat Division',
    periodOfResidence: 'Period of Residence',
    addressOverseas: 'Present Address Overseas',
    country: 'Country',
    residenceHistory: 'Residence History',
    residenceHistoryNote: 'If you have resided at other addresses during the period for which clearance is required, please provide details',
    address: 'Address',
    addAddress: 'Add Another Address',
    authorization: 'Authorization',
    authorizedPerson: 'Person Authorized to Collect the Certificate (if not self)',
    embassyAddress: 'Embassy Address for Collection',
    mailingAddress: 'Mailing Address (if to be posted)',
    contactPhone: 'Contact Phone Number',
    email: 'Email Address',
    spouseDetails: 'Spouse Details (if married)',
    spouseNicNo: "Spouse's NIC No.",
    spouseName: "Spouse's Name",
    spouseAddress: "Spouse's Address",
    declaration: 'Declaration',
    declarationText: 'I hereby declare that the information provided above is true and correct. I understand that providing false information may result in rejection of my application and/or legal action.',
    signatureOfApplicant: 'Signature of the Applicant',
    date: 'Date',
    place: 'Place',
  },
};

// Dual Citizenship Application Form (Form "S")
export interface DualCitizenshipFormData {
  applicationType: 'resumption' | 'retention' | '';
  applicationDate: string;
  eligibilityCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | '';
  fullName: string;
  nameWithInitials: string;
  addressSriLanka: string;
  addressForeign: string;
  email: string;
  contactForeign: string;
  contactLocal: string;
  dateOfBirth: string;
  placeOfBirth: string;
  birthCertNo: string;
  birthCertDistrict: string;
  nationality: string;
  nicNo: string;
  sex: 'male' | 'female' | '';
  spouseName: string;
  spouseNationality: string;
  children: Array<{ name: string; dateOfBirth: string; nationality: string }>;
  profession: string;
  citizenshipAtBirth: string;
  countryOfPresentCitizenship: string;
  dateAcquiringCitizenship: string;
  citizenshipCertNo: string;
  foreignPassportNo: string;
  foreignPassportDateOfIssue: string;
  fatherName: string;
  fatherDatePlaceOfBirth: string;
  motherName: string;
  motherDatePlaceOfBirth: string;
  fatherCertNo: string;
  fatherCertDateOfIssue: string;
  motherCertNo: string;
  motherCertDateOfIssue: string;
  slPassportNo: string;
  slPassportDateOfIssue: string;
  slPassportPlaceOfIssue: string;
  prCountry: string;
  prDateGranted: string;
  reasonsForApplication: string;
  academicQualifications: Array<{ degree: string; institution: string; period: string }>;
  professionalQualifications: Array<{ qualification: string; institution: string; period: string }>;
  assets: Array<{ details: string; deedNo: string; estimatedValue: string }>;
  fixedDeposits: Array<{ bankName: string; accountNo: string; amount: string; maturityDate: string }>;
  treasuryBonds: Array<{ investedValue: string; maturityDate: string }>;
  affidavitDate: string;
  affidavitPlace: string;
}

export const dualCitizenshipFormLabels = {
  en: {
    title: 'Department of Immigration and Emigration',
    subtitle: 'Application for Dual Citizenship',
    formTitle: 'Form "S" - Citizenship Act No 18 of 1948',
    formNote: 'Application for Resumption/Retention of Sri Lankan Citizenship',
    applicationType: 'Application Type',
    resumption: 'Resumption of Citizenship (for those who lost Sri Lankan citizenship)',
    retention: 'Retention of Citizenship (for those obtaining foreign citizenship)',
    eligibilityCategory: 'Eligibility Category',
    categoryA: 'A - 55 years or above and resided in Sri Lanka for 10+ years',
    categoryB: 'B - Holds academic/professional qualification (PhD, Masters, Medical, etc.)',
    categoryC: 'C - Acquired assets in Sri Lanka worth Rs. 2.5 Million or more',
    categoryD: 'D - Made fixed deposits in Sri Lanka of Rs. 2.5 Million or more',
    categoryE: 'E - Maintains NRFC/RFC account with Rs. 2.5 Million or more',
    categoryF: 'F - Invested in Treasury Bonds of Rs. 2.5 Million or more',
    categoryG: 'G - Spouse/Child under 22 of a dual citizenship holder',
    personalParticulars: 'Personal Particulars',
    surname: 'Surname',
    otherNames: 'Other Names',
    addressInSriLanka: 'Address in Sri Lanka',
    presentAddress: 'Present Address (Overseas)',
    dateOfBirth: 'Date of Birth',
    placeOfBirth: 'Place of Birth',
    sex: 'Sex',
    male: 'Male',
    female: 'Female',
    profession: 'Profession/Occupation',
    nicNo: 'National Identity Card No.',
    passportNo: 'Sri Lankan Passport No.',
    email: 'Email Address',
    telephoneNo: 'Telephone Number',
    foreignCitizenshipDetails: 'Foreign Citizenship Details',
    foreignCountry: 'Country of Foreign Citizenship',
    foreignCitizenshipObtainedDate: 'Date Foreign Citizenship Obtained',
    foreignPassportNo: 'Foreign Passport No.',
    foreignPassportIssueDate: 'Date of Issue',
    foreignPassportExpiryDate: 'Date of Expiry',
    foreignPassportIssuePlace: 'Place of Issue',
    slCitizenshipDetails: 'Sri Lankan Citizenship Details',
    slCitizenshipType: 'Citizenship Obtained By',
    descent: 'Descent',
    registration: 'Registration',
    slCitizenshipCertNo: 'Certificate No. (if by Registration)',
    slCitizenshipDate: 'Date of Registration',
    parentsDetails: "Parents' Details",
    fatherName: "Father's Name",
    fatherBirthPlace: "Father's Place of Birth",
    fatherNationality: "Father's Nationality",
    motherName: "Mother's Name",
    motherBirthPlace: "Mother's Place of Birth",
    motherNationality: "Mother's Nationality",
    academicDetails: 'Academic Qualifications (for Category B)',
    academicQualification: 'Qualification',
    universityName: 'University/Institution',
    degreeObtainedYear: 'Year Obtained',
    financialDetails: 'Financial Details (for Categories C, D, E, F)',
    assetDetails: 'Description of Assets',
    assetValue: 'Value of Assets',
    bankName: 'Bank Name',
    accountNumber: 'Account Number',
    depositAmount: 'Deposit Amount',
    relationDetails: 'Relation Details (for Category G)',
    relationToDualCitizen: 'Relationship to Dual Citizen',
    dualCitizenName: 'Name of Dual Citizen',
    dualCitizenCertNo: 'Dual Citizenship Certificate No.',
    declaration: 'Declaration',
    declarationText: 'I declare that the particulars furnished above are true and correct. I am aware that if any particular furnished by me is found to be incorrect, my application for Dual Citizenship is liable to be rejected or the Certificate of Dual Citizenship granted to me is liable to be cancelled.',
    signatureOfApplicant: 'Signature of Applicant',
    date: 'Date',
    place: 'Place',
  },
};

// Empty array - all forms now come from localStorage (user's added forms)
export const sampleForms: Form[] = [];

export const getFormById = (id: string): Form | undefined => {
  return sampleForms.find((form) => form.id === id);
};

export const getFormsByCategory = (category: string): Form[] => {
  return sampleForms.filter((form) => form.category === category);
};
