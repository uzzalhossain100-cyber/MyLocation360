const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());

// Serve static assets with strict no-cache headers for instant updates
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Geocoding Proxy (Nominatim / OSM) to avoid CORS or header restrictions
app.get('/api/geocode/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=bn,en`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)',
        'Accept-Language': 'bn,en;q=0.9'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode' });
  }
});

// Comprehensive Built-in Bangladesh Locations, Institutions, Landmarks & Establishments
const BD_POPULAR_PLACES = [
  // ==========================================
  // 1. MAJOR UNIVERSITIES & EDUCATIONAL INSTITUTIONS
  // ==========================================
  { name: 'ঢাকা বিশ্ববিদ্যালয়', en: 'Dhaka University (DU)', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7337', lon: '90.3928', type: 'university' },
  { name: 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয় (বুয়েট)', en: 'BUET (Bangladesh University of Engineering and Technology)', subdistrict: 'পলাশী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7266', lon: '90.3888', type: 'university' },
  { name: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', en: 'Jahangirnagar University (JU)', subdistrict: 'সাভার', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8824', lon: '90.2673', type: 'university' },
  { name: 'রাজশাহী বিশ্ববিদ্যালয়', en: 'Rajshahi University (RU)', subdistrict: 'মতিহার', district: 'রাজশাহী', country: 'বাংলাদেশ', lat: '24.3686', lon: '88.6370', type: 'university' },
  { name: 'চট্টগ্রাম বিশ্ববিদ্যালয়', en: 'Chittagong University (CU)', subdistrict: 'হাটহাজারী', district: 'চট্টগ্রাম', country: 'বাংলাদেশ', lat: '22.4716', lon: '91.7877', type: 'university' },
  { name: 'শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (SUST)', en: 'Shahjalal University of Science and Technology (SUST)', subdistrict: 'কুমারগাঁও', district: 'সিলেট', country: 'বাংলাদেশ', lat: '24.9172', lon: '91.8319', type: 'university' },
  { name: 'খুলনা বিশ্ববিদ্যালয়', en: 'Khulna University (KU)', subdistrict: 'গল্লামারী', district: 'খুলনা', country: 'বাংলাদেশ', lat: '22.8021', lon: '89.5342', type: 'university' },
  { name: 'ব্র্যাক বিশ্ববিদ্যালয়', en: 'BRAC University', subdistrict: 'মেরুল বাড্ডা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7744', lon: '90.4255', type: 'university' },
  { name: 'নর্থ সাউথ বিশ্ববিদ্যালয়', en: 'North South University (NSU)', subdistrict: 'বসুন্ধরা আ/এ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8151', lon: '90.4255', type: 'university' },
  { name: 'আমেরিকান ইন্টারন্যাশনাল ইউনিভার্সিটি (AIUB)', en: 'AIUB (American International University-Bangladesh)', subdistrict: 'কুরতলী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8222', lon: '90.4273', type: 'university' },
  { name: 'ইন্ডিপেন্ডেন্ট ইউনিভার্সিটি (IUB)', en: 'Independent University, Bangladesh (IUB)', subdistrict: 'বসুন্ধরা আ/এ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8159', lon: '90.4284', type: 'university' },
  { name: 'ইউনাইটেড ইন্টারন্যাশনাল ইউনিভার্সিটি (UIU)', en: 'United International University (UIU)', subdistrict: 'মাদানি এভিনিউ, বাড্ডা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7979', lon: '90.4497', type: 'university' },
  { name: 'আহছানউল্লা বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয় (AUST)', en: 'Ahsanullah University of Science and Technology (AUST)', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7686', lon: '90.4071', type: 'university' },
  { name: 'নটর ডেম কলেজ', en: 'Notre Dame College Dhaka', subdistrict: 'মতিঝিল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7314', lon: '90.4208', type: 'college' },
  { name: 'ঢাকা কলেজ', en: 'Dhaka College', subdistrict: 'নিউ মার্কেট', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7341', lon: '90.3838', type: 'college' },
  { name: 'ভিকারুননিসা নূন স্কুল ও কলেজ', en: 'Viqarunnisa Noon School and College', subdistrict: 'বেইলি রোড', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7431', lon: '90.4069', type: 'school' },
  { name: 'রাজউক উত্তরা মডেল কলেজ', en: 'RAJUK Uttara Model College', subdistrict: 'উত্তরা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8696', lon: '90.3892', type: 'college' },
  { name: 'হলিক্রস কলেজ', en: 'Holy Cross College Tejgaon', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7578', lon: '90.3905', type: 'college' },
  { name: 'আইডিয়াল স্কুল অ্যান্ড কলেজ', en: 'Ideal School and College Motijheel', subdistrict: 'মতিঝিল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7351', lon: '90.4219', type: 'school' },
  { name: 'ঢাকা রেসিডেনসিয়াল মডেল কলেজ', en: 'Dhaka Residential Model College', subdistrict: 'মোহাম্মদপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7656', lon: '90.3653', type: 'college' },

  // ==========================================
  // 2. HOSPITALS, MEDICAL COLLEGES & CLINICS
  // ==========================================
  { name: 'ঢাকা মেডিকেল কলেজ হাসপাতাল', en: 'Dhaka Medical College and Hospital (DMC)', subdistrict: 'বকশীবাজার', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7260', lon: '90.3975', type: 'hospital' },
  { name: 'বঙ্গবন্ধু শেখ মুজিব মেডিকেল বিশ্ববিদ্যালয় (পিজি হাসপাতাল)', en: 'BSMMU (PG Hospital)', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7397', lon: '90.3956', type: 'hospital' },
  { name: 'স্কয়ার হাসপাতাল', en: 'Square Hospital Panthapath', subdistrict: 'পান্থপথ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7531', lon: '90.3816', type: 'hospital' },
  { name: 'এভারকেয়ার হাসপাতাল ঢাকা (সাবেক অ্যাপোলো)', en: 'Evercare Hospital Dhaka (Former Apollo Hospital)', subdistrict: 'বসুন্ধরা আ/এ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8105', lon: '90.4312', type: 'hospital' },
  { name: 'ইউনাইটেড হাসপাতাল', en: 'United Hospital Gulshan', subdistrict: 'গুলশান ২', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7997', lon: '90.4144', type: 'hospital' },
  { name: 'ল্যাবএইড স্পেশালাইজড হাসপাতাল', en: 'Labaid Specialized Hospital Dhanmondi', subdistrict: 'ধানমন্ডি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7424', lon: '90.3831', type: 'hospital' },
  { name: 'কুর্মিটোলা জেনারেল হাসপাতাল', en: 'Kurmitola General Hospital', subdistrict: 'খিলক্ষেত/ক্যান্টনমেন্ট', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8236', lon: '90.4077', type: 'hospital' },
  { name: 'বারডেম জেনারেল হাসপাতাল', en: 'BIRDEM General Hospital', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7381', lon: '90.3964', type: 'hospital' },
  { name: 'শহীদ সোহরাওয়ার্দী মেডিকেল কলেজ হাসপাতাল', en: 'Shaheed Suhrawardy Medical College Hospital', subdistrict: 'শেরেবাংলা নগর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7702', lon: '90.3705', type: 'hospital' },
  { name: 'জাতীয় হৃদরোগ ইনস্টিটিউট ও হাসপাতাল', en: 'National Institute of Cardiovascular Diseases (NICVD)', subdistrict: 'শেরেবাংলা নগর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7712', lon: '90.3701', type: 'hospital' },
  { name: 'জাতীয় ক্যান্সার গবেষণা ইনস্টিটিউট ও হাসপাতাল', en: 'National Institute of Cancer Research and Hospital (NICRH)', subdistrict: 'মহাখালী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7797', lon: '90.4069', type: 'hospital' },
  { name: 'সম্মিলিত সামরিক হাসপাতাল (সিএমএইচ ঢাকা)', en: 'Combined Military Hospital (CMH Dhaka)', subdistrict: 'ঢাকা সেনানিবাস', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8173', lon: '90.3956', type: 'hospital' },
  { name: 'ইবনে সিনা হাসপাতাল ধানমন্ডি', en: 'Ibn Sina Specialized Hospital Dhanmondi', subdistrict: 'ধানমন্ডি ১৫', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7473', lon: '90.3725', type: 'hospital' },
  { name: 'বাংলাদেশ স্পেশালাইজড হাসপাতাল', en: 'Bangladesh Specialized Hospital Shyamoli', subdistrict: 'শ্যামলী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7711', lon: '90.3649', type: 'hospital' },
  { name: 'আইসিডিডিআর,বি (কলেরা হাসপাতাল)', en: 'icddr,b (Cholera Hospital Mohakhali)', subdistrict: 'মহাখালী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7788', lon: '90.4048', type: 'hospital' },
  { name: 'স্যার সলিমুল্লাহ মেডিকেল কলেজ (মিটফোর্ড হাসপাতাল)', en: 'Sir Salimullah Medical College (Mitford Hospital)', subdistrict: 'বাবুবাজার', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7107', lon: '90.4024', type: 'hospital' },

  // ==========================================
  // 3. NATIONAL LANDMARKS, MONUMENTS & HISTORIC SITES
  // ==========================================
  { name: 'জাতীয় সংসদ ভবন', en: 'National Parliament of Bangladesh (Jatiya Sangsad Bhaban)', subdistrict: 'শেরেবাংলা নগর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7624', lon: '90.3787', type: 'monument' },
  { name: 'জাতীয় স্মৃতিসৌধ', en: 'National Martyrs\' Memorial Savar', subdistrict: 'সাভার', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.9117', lon: '90.2544', type: 'monument' },
  { name: 'কেন্দ্রীয় শহীদ মিনার', en: 'Central Shaheed Minar', subdistrict: 'ঢাকা বিশ্ববিদ্যালয় এলাকা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7274', lon: '90.3966', type: 'monument' },
  { name: 'লালবাগ কেল্লা', en: 'Lalbagh Fort', subdistrict: 'লালবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7188', lon: '90.3881', type: 'historic' },
  { name: 'আহসান মঞ্জিল জাদুঘর', en: 'Ahsan Manzil Museum', subdistrict: 'ইসলামপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7086', lon: '90.4060', type: 'historic' },
  { name: 'বায়তুল মোকাররম জাতীয় মসজিদ', en: 'Baitul Mukarram National Mosque', subdistrict: 'পল্টন', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7297', lon: '90.4128', type: 'place_of_worship' },
  { name: 'তারা মসজিদ', en: 'Tara Masjid (Star Mosque)', subdistrict: 'আরমানিটোলা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7153', lon: '90.4005', type: 'place_of_worship' },
  { name: 'ঢাকেশ্বরী জাতীয় মন্দির', en: 'Dhakeshwari National Temple', subdistrict: 'লালবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7231', lon: '90.3899', type: 'place_of_worship' },
  { name: 'হাতিরঝিল অ্যাম্ফিথিয়েটার ও ব্রিজ', en: 'Hatirjheel', subdistrict: 'তেজগাঁও/রামপুরা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7712', lon: '90.4132', type: 'attraction' },
  { name: 'রমনা পার্ক', en: 'Ramna Park', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7383', lon: '90.4005', type: 'park' },
  { name: 'সোহরাওয়ার্দী উদ্যান', en: 'Suhrawardy Udyan', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7347', lon: '90.3978', type: 'park' },
  { name: 'চন্দ্রিমা উদ্যান (জিয়া উদ্যান)', en: 'Chandrima Udyan', subdistrict: 'শেরেবাংলা নগর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7668', lon: '90.3789', type: 'park' },
  { name: 'জাতীয় জাদুঘর ঢাকা', en: 'Bangladesh National Museum Shahbag', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7377', lon: '90.3944', type: 'museum' },
  { name: 'মুক্তিযুদ্ধ জাদুঘর আগারগাঁও', en: 'Liberation War Museum Agargaon', subdistrict: 'আগারগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7772', lon: '90.3734', type: 'museum' },
  { name: 'বাংলাদেশ জাতীয় চিড়িয়াখানা মিরপুর', en: 'Bangladesh National Zoo Mirpur', subdistrict: 'মিরপুর ১', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8122', lon: '90.3478', type: 'zoo' },
  { name: 'জাতীয় উদ্ভিদ উদ্যান (বোটানিক্যাল গার্ডেন)', en: 'National Botanical Garden Mirpur', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8189', lon: '90.3497', type: 'park' },
  { name: 'পদ্মা বহুমুখী সেতু', en: 'Padma Multipurpose Bridge (Mawa - Jajira)', subdistrict: 'মাওয়া', district: 'মুন্সীগঞ্জ/শরীয়তপুর', country: 'বাংলাদেশ', lat: '23.4475', lon: '90.2642', type: 'bridge' },
  { name: 'বঙ্গবন্ধু যমুনা সেতু', en: 'Bangabandhu Bridge (Jamuna Bridge)', subdistrict: 'ভূঞাপুর', district: 'টাঙ্গাইল/সিরাজগঞ্জ', country: 'বাংলাদেশ', lat: '24.3986', lon: '89.7619', type: 'bridge' },
  { name: 'কর্ণফুলী টানেল (বঙ্গবন্ধু টানেল)', en: 'Bangabandhu Sheikh Mujibur Rahman Tunnel (Karnaphuli Tunnel)', subdistrict: 'পতেঙ্গা', district: 'চট্টগ্রাম', country: 'বাংলাদেশ', lat: '22.2356', lon: '91.8021', type: 'tunnel' },
  { name: 'ষাট গম্বুজ মসজিদ', en: 'Sixty Dome Mosque (Shat Gombuj Masjid)', subdistrict: 'বাগেরহাট সদর', district: 'বাগেরহাট', country: 'বাংলাদেশ', lat: '22.6744', lon: '89.7417', type: 'historic' },
  { name: 'পাহাড়পুর বৌদ্ধ বিহার', en: 'Somapura Mahavihara Paharpur', subdistrict: 'বদলগাছী', district: 'নওগাঁ', country: 'বাংলাদেশ', lat: '25.0315', lon: '88.9772', type: 'historic' },
  { name: 'মহাস্থানগড়', en: 'Mahasthangarh Bogura', subdistrict: 'শিবগঞ্জ', district: 'বগুড়া', country: 'বাংলাদেশ', lat: '24.9614', lon: '89.3458', type: 'historic' },
  { name: 'কান্তজীউ মন্দির', en: 'Kantajew Temple Dinajpur', subdistrict: 'কাহারোল', district: 'দিনাজপুর', country: 'বাংলাদেশ', lat: '25.7925', lon: '88.6492', type: 'historic' },

  // ==========================================
  // 4. SHOPPING MALLS, MARKETS & COMMERCIAL CENTERS
  // ==========================================
  { name: 'বসুন্ধরা সিটি শপিং কমপ্লেক্স', en: 'Bashundhara City Shopping Mall Panthapath', subdistrict: 'পান্থপথ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7511', lon: '90.3908', type: 'mall' },
  { name: 'যমুনা ফিউচার পার্ক', en: 'Jamuna Future Park Kuril', subdistrict: 'বারিধারা/কুড়িল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8135', lon: '90.4242', type: 'mall' },
  { name: 'পুলিশ প্লাজা কনকর্ড', en: 'Police Plaza Concord Shopping Mall', subdistrict: 'গুলশান ১', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7779', lon: '90.4162', type: 'mall' },
  { name: 'সীমান্ত সম্ভার / সীমান্ত স্কয়ার', en: 'Shimanto Shambhar / Shimanto Square Dhanmondi', subdistrict: 'ধানমন্ডি ২', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7388', lon: '90.3802', type: 'mall' },
  { name: 'রাপা প্লাজা ধানমন্ডি', en: 'Rapa Plaza Dhanmondi 27', subdistrict: 'ধানমন্ডি ২৭', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7533', lon: '90.3722', type: 'mall' },
  { name: 'মৌচাক মার্কেট', en: 'Mouchak Market Malibagh', subdistrict: 'মালিবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7483', lon: '90.4136', type: 'mall' },
  { name: 'নিউ মার্কেট ঢাকা', en: 'Dhaka New Market', subdistrict: 'নিউ মার্কেট', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7335', lon: '90.3842', type: 'commercial' },
  { name: 'গাউসিয়া মার্কেট', en: 'Gausia Market Dhaka', subdistrict: 'নিউ মার্কেট', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7351', lon: '90.3839', type: 'commercial' },
  { name: 'কারওয়ান বাজার পাইকারি আড়ত', en: 'Kawran Bazar DIT Wholesale Market', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7516', lon: '90.3934', type: 'commercial' },

  // ==========================================
  // 5. AIRPORTS, RAILWAY STATIONS & BUS TERMINALS
  // ==========================================
  { name: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর', en: 'Hazrat Shahjalal International Airport (DAC)', subdistrict: 'কুর্মিটোলা/উত্তরা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8433', lon: '90.3978', type: 'airport' },
  { name: 'শাহ আমানত আন্তর্জাতিক বিমানবন্দর', en: 'Shah Amanat International Airport Chattogram (CGP)', subdistrict: 'পতেঙ্গা', district: 'চট্টগ্রাম', country: 'বাংলাদেশ', lat: '22.2496', lon: '91.8133', type: 'airport' },
  { name: 'ওসমানী আন্তর্জাতিক বিমানবন্দর', en: 'Osmani International Airport Sylhet (ZYL)', subdistrict: 'সিলেট সদর', district: 'সিলেট', country: 'বাংলাদেশ', lat: '24.9633', lon: '91.8667', type: 'airport' },
  { name: 'কক্সবাজার বিমানবন্দর', en: 'Cox\'s Bazar Airport (CXB)', subdistrict: 'কক্সবাজার সদর', district: 'কক্সবাজার', country: 'বাংলাদেশ', lat: '21.4522', lon: '91.9639', type: 'airport' },
  { name: 'সৈয়দপুর বিমানবন্দর', en: 'Saidpur Airport Nilphamari', subdistrict: 'সৈয়দপুর', district: 'নীলফামারী', country: 'বাংলাদেশ', lat: '25.7592', lon: '88.9089', type: 'airport' },
  { name: 'কমলাপুর রেলওয়ে স্টেশন', en: 'Kamalapur Railway Station (Dhaka Central)', subdistrict: 'মতিঝিল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7315', lon: '90.4255', type: 'station' },
  { name: 'ঢাকা বিমানবন্দর রেলওয়ে স্টেশন', en: 'Dhaka Airport Railway Station', subdistrict: 'বিমানবন্দর এলাকা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8519', lon: '90.4079', type: 'station' },
  { name: 'চট্টগ্রাম রেলওয়ে স্টেশন', en: 'Chattogram Railway Station', subdistrict: 'বটতলী', district: 'চট্টগ্রাম', country: 'বাংলাদেশ', lat: '22.3333', lon: '91.8294', type: 'station' },
  { name: 'গাবতলী বাস টার্মিনাল', en: 'Gabtoli Bus Terminal', subdistrict: 'দারুস সালাম', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7844', lon: '90.3444', type: 'station' },
  { name: 'মহাখালী বাস টার্মিনাল', en: 'Mohakhali Bus Terminal', subdistrict: 'মহাখালী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7744', lon: '90.3986', type: 'station' },
  { name: 'সায়েদাবাদ বাস টার্মিনাল', en: 'Sayedabad Bus Terminal', subdistrict: 'যাত্রাবাড়ী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7144', lon: '90.4300', type: 'station' },
  { name: 'সদরঘাট লঞ্চ টার্মিনাল', en: 'Sadarghat Launch Terminal (Dhaka River Port)', subdistrict: 'কোতোয়ালি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7039', lon: '90.4111', type: 'station' },

  // ==========================================
  // 6. STADIUMS & SPORTS COMPLEXES
  // ==========================================
  { name: 'শের-ই-বাংলা জাতীয় ক্রিকেট স্টেডিয়াম', en: 'Sher-e-Bangla National Cricket Stadium Mirpur', subdistrict: 'মিরপুর ২', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8069', lon: '90.3638', type: 'stadium' },
  { name: 'বঙ্গবন্ধু জাতীয় স্টেডিয়াম', en: 'Bangabandhu National Stadium Dhaka', subdistrict: 'মতিঝিল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7289', lon: '90.4125', type: 'stadium' },
  { name: 'জহুর আহমেদ চৌধুরী স্টেডিয়াম', en: 'Zahur Ahmed Chowdhury Stadium Chattogram', subdistrict: 'সাগরিকা', district: 'চট্টগ্রাম', country: 'বাংলাদেশ', lat: '22.3592', lon: '91.7719', type: 'stadium' },
  { name: 'বসুন্ধরা কিংস এরিনা', en: 'Bashundhara Kings Arena', subdistrict: 'বসুন্ধরা স্পোর্টস কমপ্লেক্স', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8197', lon: '90.4639', type: 'stadium' },

  // ==========================================
  // 7. DHAKA AREAS, THANAS & SUBURBS
  // ==========================================
  { name: 'উত্তরা', en: 'Uttara', subdistrict: 'উত্তরা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8759', lon: '90.3795', type: 'suburb' },
  { name: 'উত্তরা সেক্টর ১০', en: 'Uttara Sector 10', subdistrict: 'উত্তরা পশ্চিম', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8833', lon: '90.3800', type: 'suburb' },
  { name: 'মিরপুর', en: 'Mirpur', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8071', lon: '90.3686', type: 'suburb' },
  { name: 'মিরপুর ১০', en: 'Mirpur 10 Circle', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8069', lon: '90.3687', type: 'suburb' },
  { name: 'মিরপুর ১', en: 'Mirpur 1', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7956', lon: '90.3537', type: 'suburb' },
  { name: 'মিরপুর ২', en: 'Mirpur 2', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8042', lon: '90.3619', type: 'suburb' },
  { name: 'মিরপুর ডিওএইচএস', en: 'Mirpur DOHS', subdistrict: 'পল্লবী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8344', lon: '90.3681', type: 'suburb' },
  { name: 'ধানমন্ডি', en: 'Dhanmondi', subdistrict: 'ধানমন্ডি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7461', lon: '90.3742', type: 'suburb' },
  { name: 'ধানমন্ডি ৩২', en: 'Dhanmondi 32', subdistrict: 'ধানমন্ডি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7516', lon: '90.3777', type: 'suburb' },
  { name: 'ধানমন্ডি লেক', en: 'Dhanmondi Lake', subdistrict: 'ধানমন্ডি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7472', lon: '90.3792', type: 'park' },
  { name: 'গুলশান', en: 'Gulshan', subdistrict: 'গুলশান', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7925', lon: '90.4078', type: 'suburb' },
  { name: 'গুলশান ১', en: 'Gulshan 1 Circle', subdistrict: 'গুলশান', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7797', lon: '90.4161', type: 'suburb' },
  { name: 'গুলশান ২', en: 'Gulshan 2 Circle', subdistrict: 'গুলশান', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7942', lon: '90.4142', type: 'suburb' },
  { name: 'বনানী', en: 'Banani', subdistrict: 'বনানী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7937', lon: '90.4043', type: 'suburb' },
  { name: 'বনানী ডিওএইচএস', en: 'Banani DOHS', subdistrict: 'ঢাকা ক্যান্টনমেন্ট', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7981', lon: '90.3986', type: 'suburb' },
  { name: 'বারিধারা ডিপ্লোম্যাটিক জোন', en: 'Baridhara Diplomatic Zone', subdistrict: 'ভাটারা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7989', lon: '90.4228', type: 'suburb' },
  { name: 'বসুন্ধরা আবাসিক এলাকা', en: 'Bashundhara R/A', subdistrict: 'ভাটারা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8191', lon: '90.4326', type: 'suburb' },
  { name: 'মোহাম্মদপুর', en: 'Mohammadpur', subdistrict: 'মোহাম্মদপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7658', lon: '90.3584', type: 'suburb' },
  { name: 'ফার্মগেট', en: 'Farmgate', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7561', lon: '90.3872', type: 'suburb' },
  { name: 'শাহবাগ', en: 'Shahbag', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7389', lon: '90.3957', type: 'suburb' },
  { name: 'মতিঝিল', en: 'Motijheel Commercial Area', subdistrict: 'মতিঝিল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7330', lon: '90.4172', type: 'commercial' },
  { name: 'কারওয়ান বাজার', en: 'Kawran Bazar', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7516', lon: '90.3934', type: 'suburb' },
  { name: 'তেজগাঁও শিল্পাঞ্চল', en: 'Tejgaon Industrial Area', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7639', lon: '90.3989', type: 'suburb' },
  { name: 'যাত্রাবাড়ী', en: 'Jatrabari', subdistrict: 'যাত্রাবাড়ী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7118', lon: '90.4346', type: 'suburb' },
  { name: 'বাড্ডা', en: 'Badda', subdistrict: 'বাড্ডা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7806', lon: '90.4267', type: 'suburb' },
  { name: 'রামপুরা', en: 'Rampura', subdistrict: 'রামপুরা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7612', lon: '90.4208', type: 'suburb' },
  { name: 'মালিবাগ', en: 'Malibagh', subdistrict: 'শাহজাহানপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7487', lon: '90.4128', type: 'suburb' },
  { name: 'খিলগাঁও', en: 'Khilgaon', subdistrict: 'খিলগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7523', lon: '90.4285', type: 'suburb' },
  { name: 'পুরান ঢাকা', en: 'Old Dhaka', subdistrict: 'কোতোয়ালি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7099', lon: '90.4071', type: 'suburb' },
  { name: 'আগারগাঁও', en: 'Agargaon', subdistrict: 'শেরেবাংলা নগর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7785', lon: '90.3792', type: 'suburb' },
  { name: 'শ্যামলী', en: 'Shyamoli', subdistrict: 'মোহাম্মদপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7719', lon: '90.3644', type: 'suburb' },
  { name: 'কাকরাইল', en: 'Kakrail', subdistrict: 'রমনা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7381', lon: '90.4086', type: 'suburb' },
  { name: 'পল্লবী', en: 'Pallabi', subdistrict: 'পল্লবী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8247', lon: '90.3642', type: 'suburb' },
  { name: 'কালশী', en: 'Kalshi', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8231', lon: '90.3756', type: 'suburb' },
  { name: 'খিলক্ষেত', en: 'Khilkhet', subdistrict: 'খিলক্ষেত', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8306', lon: '90.4189', type: 'suburb' },

  // ==========================================
  // 8. DIVISIONS, DISTRICTS & TOURIST HUBS
  // ==========================================
  { name: 'ঢাকা', en: 'Dhaka', subdistrict: 'ঢাকা', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.8103', lon: '90.4125', type: 'city' },
  { name: 'চট্টগ্রাম', en: 'Chattogram', subdistrict: 'চট্টগ্রাম সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '22.3569', lon: '91.7832', type: 'city' },
  { name: 'সিলেট', en: 'Sylhet', subdistrict: 'সিলেট সদর', district: 'সিলেট বিভাগ', country: 'বাংলাদেশ', lat: '24.8949', lon: '91.8687', type: 'city' },
  { name: 'রাজশাহী', en: 'Rajshahi', subdistrict: 'রাজশাহী সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.3745', lon: '88.6042', type: 'city' },
  { name: 'খুলনা', en: 'Khulna', subdistrict: 'খুলনা সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '22.8456', lon: '89.5403', type: 'city' },
  { name: 'বরিশাল', en: 'Barishal', subdistrict: 'বরিশাল সদর', district: 'বরিশাল বিভাগ', country: 'বাংলাদেশ', lat: '22.7010', lon: '90.3535', type: 'city' },
  { name: 'রংপুর', en: 'Rangpur', subdistrict: 'রংপুর সদর', district: 'রংপুর বিভাগ', country: 'বাংলাদেশ', lat: '25.7439', lon: '89.2752', type: 'city' },
  { name: 'ময়মনসিংহ', en: 'Mymensingh', subdistrict: 'ময়মনসিংহ সদর', district: 'ময়মনসিংহ বিভাগ', country: 'বাংলাদেশ', lat: '24.7471', lon: '90.4203', type: 'city' },
  { name: 'কক্সবাজার', en: 'Cox\'s Bazar', subdistrict: 'কক্সবাজার সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '21.4272', lon: '92.0058', type: 'city' },
  { name: 'কুমিল্লা', en: 'Cumilla', subdistrict: 'কুমিল্লা আদর্শ সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.4607', lon: '91.1809', type: 'city' },
  { name: 'গাজীপুর', en: 'Gazipur', subdistrict: 'গাজীপুর সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.9999', lon: '90.4203', type: 'city' },
  { name: 'নারায়ণগঞ্জ', en: 'Narayanganj', subdistrict: 'নারায়ণগঞ্জ সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.6238', lon: '90.5000', type: 'city' },
  { name: 'বগুড়া', en: 'Bogura', subdistrict: 'বগুড়া সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.8465', lon: '89.3770', type: 'city' },
  { name: 'যশোর', en: 'Jashore', subdistrict: 'যশোর সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.1664', lon: '89.2081', type: 'city' },
  { name: 'দিনাজপুর', en: 'Dinajpur', subdistrict: 'দিনাজপুর সদর', district: 'রংপুর বিভাগ', country: 'বাংলাদেশ', lat: '25.6217', lon: '88.6355', type: 'city' },
  { name: 'ফরিদপুর', en: 'Faridpur', subdistrict: 'ফরিদপুর সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.6071', lon: '89.8426', type: 'city' },
  { name: 'টাঙ্গাইল', en: 'Tangail', subdistrict: 'টাঙ্গাইল সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '24.2513', lon: '89.9167', type: 'city' },
  { name: 'পাবনা', en: 'Pabna', subdistrict: 'পাবনা সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.0064', lon: '89.2372', type: 'city' },
  { name: 'কুষ্টিয়া', en: 'Kushtia', subdistrict: 'কুষ্টিয়া সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.9013', lon: '89.1205', type: 'city' },
  { name: 'নোয়াখালী', en: 'Noakhali', subdistrict: 'নোয়াখালী সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '22.8696', lon: '91.0991', type: 'city' },
  { name: 'ফেনী', en: 'Feni', subdistrict: 'ফেনী সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.0159', lon: '91.3976', type: 'city' },
  { name: 'চাঁদপুর', en: 'Chandpur', subdistrict: 'চাঁদপুর সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.2332', lon: '90.6713', type: 'city' },
  { name: 'ব্রাহ্মণবাড়িয়া', en: 'Brahmanbaria', subdistrict: 'ব্রাহ্মণবাড়িয়া সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.9571', lon: '91.1119', type: 'city' },
  { name: 'কিশোরগঞ্জ', en: 'Kishoreganj', subdistrict: 'কিশোরগঞ্জ সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '24.4449', lon: '90.7766', type: 'city' },
  { name: 'নরসিংদী', en: 'Narsingdi', subdistrict: 'নরসিংদী সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.9322', lon: '90.7154', type: 'city' },
  { name: 'মানিকগঞ্জ', en: 'Manikganj', subdistrict: 'মানিকগঞ্জ সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.8644', lon: '90.0047', type: 'city' },
  { name: 'মুন্সীগঞ্জ', en: 'Munshiganj', subdistrict: 'মুন্সীগঞ্জ সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.5422', lon: '90.5305', type: 'city' },
  { name: 'সিরাজগঞ্জ', en: 'Sirajganj', subdistrict: 'সিরাজগঞ্জ সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.4534', lon: '89.7008', type: 'city' },
  { name: 'নাটোর', en: 'Natore', subdistrict: 'নাটোর সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.4206', lon: '89.0003', type: 'city' },
  { name: 'নওগাঁ', en: 'Naogaon', subdistrict: 'নওগাঁ সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.7936', lon: '88.9318', type: 'city' },
  { name: 'সাতক্ষীরা', en: 'Satkhira', subdistrict: 'সাতক্ষীরা সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '22.7185', lon: '89.0705', type: 'city' },
  { name: 'বাগেরহাট', en: 'Bagerhat', subdistrict: 'বাগেরহাট সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '22.6516', lon: '89.7859', type: 'city' },
  { name: 'ঝিনাইদহ', en: 'Jhenaidah', subdistrict: 'ঝিনাইদহ সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.5448', lon: '89.1539', type: 'city' },
  { name: 'চুয়াডাঙ্গা', en: 'Chuadanga', subdistrict: 'চুয়াডাঙ্গা সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.6402', lon: '88.8418', type: 'city' },
  { name: 'মেহেরপুর', en: 'Meherpur', subdistrict: 'মেহেরপুর সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.7622', lon: '88.6318', type: 'city' },
  { name: 'মাগুরা', en: 'Magura', subdistrict: 'মাগুরা সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.4873', lon: '89.4199', type: 'city' },
  { name: 'নড়াইল', en: 'Narail', subdistrict: 'নড়াইল সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.1725', lon: '89.5127', type: 'city' },
  { name: 'ভোলা', en: 'Bhola', subdistrict: 'ভোলা সদর', district: 'বরিশাল বিভাগ', country: 'বাংলাদেশ', lat: '22.6859', lon: '90.6482', type: 'city' },
  { name: 'পটুয়াখালী', en: 'Patuakhali', subdistrict: 'পটুয়াখালী সদর', district: 'বরিশাল বিভাগ', country: 'বাংলাদেশ', lat: '22.3596', lon: '90.3299', type: 'city' },
  { name: 'পিরোজপুর', en: 'Pirojpur', subdistrict: 'পিরোজপুর সদর', district: 'বরিশাল বিভাগ', country: 'বাংলাদেশ', lat: '22.5841', lon: '89.9720', type: 'city' },
  { name: 'বরগুনা', en: 'Barguna', subdistrict: 'বরগুনা সদর', district: 'বরিশাল বিভাগ', country: 'বাংলাদেশ', lat: '22.1570', lon: '90.1256', type: 'city' },
  { name: 'ঝালকাঠি', en: 'Jhalokati', subdistrict: 'ঝালকাঠি সদর', district: 'বরিশাল বিভাগ', country: 'বাংলাদেশ', lat: '22.6406', lon: '90.1987', type: 'city' },
  { name: 'সুনামগঞ্জ', en: 'Sunamganj', subdistrict: 'সুনামগঞ্জ সদর', district: 'সিলেট বিভাগ', country: 'বাংলাদেশ', lat: '25.0658', lon: '91.3950', type: 'city' },
  { name: 'মৌলভীবাজার', en: 'Moulvibazar', subdistrict: 'মৌলভীবাজার সদর', district: 'সিলেট বিভাগ', country: 'বাংলাদেশ', lat: '24.4829', lon: '91.7774', type: 'city' },
  { name: 'হবিগঞ্জ', en: 'Habiganj', subdistrict: 'হবিগঞ্জ সদর', district: 'সিলেট বিভাগ', country: 'বাংলাদেশ', lat: '24.3749', lon: '91.4155', type: 'city' },
  { name: 'শ্রীমঙ্গল', en: 'Sreemangal', subdistrict: 'শ্রীমঙ্গল', district: 'মৌলভীবাজার', country: 'বাংলাদেশ', lat: '24.3065', lon: '91.7296', type: 'town' },
  { name: 'সেন্টমার্টিন', en: 'Saint Martin Island', subdistrict: 'টেকনাফ', district: 'কক্সবাজার', country: 'বাংলাদেশ', lat: '20.6277', lon: '92.3225', type: 'island' },
  { name: 'সাজেক ভ্যালি', en: 'Sajek Valley', subdistrict: 'বাঘাইছড়ি', district: 'রাঙ্গামাটি', country: 'বাংলাদেশ', lat: '23.3820', lon: '92.2938', type: 'tourist' },
  { name: 'জাফলং', en: 'Jaflong', subdistrict: 'গোয়াইনঘাট', district: 'সিলেট', country: 'বাংলাদেশ', lat: '25.1634', lon: '92.0163', type: 'tourist' },
  { name: 'কুয়াকাটা', en: 'Kuakata', subdistrict: 'কলাপাড়া', district: 'পটুয়াখালী', country: 'বাংলাদেশ', lat: '21.8167', lon: '90.1167', type: 'beach' },
  { name: 'বান্দরবান', en: 'Bandarban', subdistrict: 'বান্দরবান সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '22.1953', lon: '92.2184', type: 'city' },
  { name: 'রাঙ্গামাটি', en: 'Rangamati', subdistrict: 'রাঙ্গামাটি সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '22.6533', lon: '92.1753', type: 'city' },
  { name: 'খাগড়াছড়ি', en: 'Khagrachhari', subdistrict: 'খাগড়াছড়ি সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.1193', lon: '91.9847', type: 'city' }
];

// Helper: Haversine distance in kilometers
function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

// Search location, village, union, school, college, institution, landmark & place geocoding
app.get('/api/geocode/search', async (req, res) => {
  const { q, lat, lon } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query q is required' });
  }
  const cleanQ = q.trim();
  const lowerQ = cleanQ.toLowerCase();

  const userLat = lat ? parseFloat(lat) : null;
  const userLon = lon ? parseFloat(lon) : null;
  const hasUserCoords = userLat !== null && !isNaN(userLat) && userLon !== null && !isNaN(userLon);

  try {
    let combinedResults = [];
    const seenMap = new Map();

    const addUniqueResult = (item) => {
      const iLat = parseFloat(item.lat);
      const iLon = parseFloat(item.lon);
      if (isNaN(iLat) || isNaN(iLon)) return;
      const key = `${iLat.toFixed(4)},${iLon.toFixed(4)}`;
      if (!seenMap.has(key) && !seenMap.has(item.name.toLowerCase())) {
        seenMap.set(key, true);
        seenMap.set(item.name.toLowerCase(), true);

        // Detect type from name / properties if generic
        const nameLower = (item.name + ' ' + (item.display_name || '')).toLowerCase();
        let detectedType = item.type || 'place';
        if (nameLower.includes('স্কুল') || nameLower.includes('বিদ্যালয়') || nameLower.includes('বিদ্যালয়') || nameLower.includes('school') || nameLower.includes('মাদ্রাসা') || nameLower.includes('madrasa')) {
          detectedType = 'school';
        } else if (nameLower.includes('কলেজ') || nameLower.includes('college') || nameLower.includes('মহাবিদ্যালয়')) {
          detectedType = 'college';
        } else if (nameLower.includes('বিশ্ববিদ্যালয়') || nameLower.includes('বিশ্ববিদ্যালয়') || nameLower.includes('university') || nameLower.includes('বুয়েট') || nameLower.includes('buet')) {
          detectedType = 'university';
        } else if (nameLower.includes('হাসপাতাল') || nameLower.includes('hospital') || nameLower.includes('ক্লিনিক') || nameLower.includes('clinic') || nameLower.includes('স্বাস্থ্য')) {
          detectedType = 'hospital';
        } else if (nameLower.includes('গ্রাম') || nameLower.includes('village') || nameLower.includes('মৌজা') || nameLower.includes('ইউনিয়ন') || nameLower.includes('union') || nameLower.includes('hamlet')) {
          detectedType = 'village';
        } else if (nameLower.includes('বাজার') || nameLower.includes('market') || nameLower.includes('হাট') || nameLower.includes('মার্কেট') || nameLower.includes('mall') || nameLower.includes('প্লাজা')) {
          detectedType = 'commercial';
        }
        item.type = detectedType;

        // Determine Region / Tier Priority
        const isInsideBangladesh = (iLat >= 20.4 && iLat <= 26.8 && iLon >= 88.0 && iLon <= 92.9) ||
                                  (item.country && (item.country.includes('বাংলাদেশ') || item.country.toLowerCase().includes('bangladesh')));

        if (hasUserCoords) {
          const dist = calcDistanceKm(userLat, userLon, iLat, iLon);
          item.distance = dist;

          if (dist <= 30) {
            item.tier = 1; // Priority 1: User's location area / Nearby
            const distStr = dist < 1 ? `${toBengaliDigits(Math.round(dist * 1000))} মি.` : `${toBengaliDigits(dist.toFixed(1))} কিমি`;
            item.badgeText = `📍 আপনার নিকটস্থ (${distStr})`;
            item.tierName = 'nearby';
          } else if (isInsideBangladesh) {
            item.tier = 2; // Priority 2: Across Bangladesh
            item.badgeText = '🇧🇩 বাংলাদেশ';
            item.tierName = 'bangladesh';
          } else {
            item.tier = 3; // Priority 3: Worldwide / Global
            item.badgeText = '🌍 বিশ্ব';
            item.tierName = 'world';
          }
        } else {
          item.tier = isInsideBangladesh ? 2 : 3;
          item.badgeText = isInsideBangladesh ? '🇧🇩 বাংলাদেশ' : '🌍 বিশ্ব';
          item.tierName = isInsideBangladesh ? 'bangladesh' : 'world';
        }

        combinedResults.push(item);
      }
    };

    // 1. Instant Match from BD_POPULAR_PLACES dictionary (institutions, landmarks, places)
    const localMatches = BD_POPULAR_PLACES.filter(p => {
      const pNameLower = p.name.toLowerCase();
      const pEnLower = (p.en || '').toLowerCase();
      const subLower = (p.subdistrict || '').toLowerCase();
      const distLower = (p.district || '').toLowerCase();

      return pNameLower.includes(lowerQ) ||
             pEnLower.includes(lowerQ) ||
             lowerQ.includes(pNameLower) ||
             (cleanQ.length > 2 && (subLower.includes(lowerQ) || distLower.includes(lowerQ)));
    }).map(p => ({
      display_name: `${p.name}, ${p.subdistrict ? p.subdistrict + ', ' : ''}${p.district}, ${p.country}`,
      name: p.name,
      subdistrict: p.subdistrict,
      district: p.district,
      country: p.country,
      lat: p.lat,
      lon: p.lon,
      type: p.type
    }));

    localMatches.forEach(addUniqueResult);

    // 2. Parallel Online Search: Nominatim + Photon Komoot (unrestricted, includes all villages, schools, colleges, institutions)
    const onlinePromises = [];

    // 2a. Photon Komoot API with user coords bias (indexes ALL villages, schools, colleges, landmarks)
    const photonUrl = hasUserCoords
      ? `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=25&lat=${userLat}&lon=${userLon}&lang=en`
      : `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=25&lang=en`;

    onlinePromises.push(
      fetch(photonUrl)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    // 2b. OpenStreetMap Nominatim Unrestricted Search (supports villages, hamlets, schools, colleges in Bengali and English)
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&limit=20&addressdetails=1&accept-language=bn,en`;
    onlinePromises.push(
      fetch(nomUrl, {
        headers: {
          'User-Agent': 'MyLocation360App/3.0 (contact@arena.ai)',
          'Accept-Language': 'bn,en;q=0.9'
        }
      }).then(r => r.ok ? r.json() : []).catch(() => [])
    );

    const [photonRes, nomRes] = await Promise.allSettled(onlinePromises);

    // Process Photon Komoot results (great for local villages, schools, colleges)
    if (photonRes.status === 'fulfilled' && photonRes.value && photonRes.value.features) {
      photonRes.value.features.forEach(f => {
        const p = f.properties || {};
        const coords = f.geometry ? f.geometry.coordinates : null;
        if (!coords) return;
        const pName = p.name || p.street || cleanQ;
        const parts = [pName, p.district || p.suburb, p.city || p.county, p.country].filter(Boolean);

        addUniqueResult({
          display_name: parts.join(', '),
          name: pName,
          subdistrict: p.suburb || p.district || '',
          district: p.city || p.county || p.state || '',
          country: p.country || '',
          lat: coords[1].toString(),
          lon: coords[0].toString(),
          type: p.osm_value || p.type || 'place'
        });
      });
    }

    // Process Nominatim results
    if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value)) {
      nomRes.value.forEach(item => {
        const addr = item.address || {};
        const thana = addr.village || addr.hamlet || addr.suburb || addr.quarter || addr.neighbourhood || addr.subdistrict || '';
        const district = addr.city || addr.town || addr.county || addr.state || '';
        const country = addr.country || '';
        const itemName = item.name || item.display_name.split(',')[0];

        addUniqueResult({
          display_name: item.display_name,
          name: itemName,
          subdistrict: thana,
          district: district,
          country: country,
          lat: item.lat,
          lon: item.lon,
          type: item.type || item.class || 'location'
        });
      });
    }

    // 3. Strict 3-Tier Priority Sorting:
    // Tier 1: User's location area first (sorted by closest distance)
    // Tier 2: Across Bangladesh (villages, schools, colleges, districts)
    // Tier 3: Worldwide / International locations
    combinedResults.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier; // 1 before 2 before 3
      }
      if (a.tier === 1 && a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance; // closest nearby first
      }
      return 0;
    });

    res.json(combinedResults.slice(0, 18));

  } catch (error) {
    console.error('Search geocode overall error:', error);
    res.status(500).json({ error: 'Failed to search geocode' });
  }
});

// Nearby POI search
app.get('/api/nearby', async (req, res) => {
  const { lat, lon, type } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const queryTerm = type || 'hospital,school,restaurant,mosque';
    const minLon = Number(lon) - 0.02;
    const maxLon = Number(lon) + 0.02;
    const minLat = Number(lat) - 0.02;
    const maxLat = Number(lat) + 0.02;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryTerm)}&bounded=1&viewbox=${minLon},${maxLat},${maxLon},${minLat}&limit=12`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby places' });
  }
});

// Fallback to index.html for SPA (compatible with Express 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MyLocation360 server running at http://0.0.0.0:${PORT}`);
});
