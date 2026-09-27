const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Comprehensive Built-in Bangladesh Locations (Divisions, Districts, Major Thanas, Dhaka Areas & Tourist Spots)
const BD_POPULAR_PLACES = [
  // Dhaka Areas & Thanas
  { name: 'উত্তরা', en: 'Uttara', subdistrict: 'উত্তরা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8759', lon: '90.3795', type: 'suburb' },
  { name: 'মিরপুর', en: 'Mirpur', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8071', lon: '90.3686', type: 'suburb' },
  { name: 'মিরপুর ১০', en: 'Mirpur 10', subdistrict: 'মিরপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8069', lon: '90.3687', type: 'suburb' },
  { name: 'ধানমন্ডি', en: 'Dhanmondi', subdistrict: 'ধানমন্ডি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7461', lon: '90.3742', type: 'suburb' },
  { name: 'গুলশান', en: 'Gulshan', subdistrict: 'গুলশান', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7925', lon: '90.4078', type: 'suburb' },
  { name: 'বনানী', en: 'Banani', subdistrict: 'বনানী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7937', lon: '90.4043', type: 'suburb' },
  { name: 'বসুন্ধরা আবাসিক এলাকা', en: 'Bashundhara R/A', subdistrict: 'ভাটারা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.8191', lon: '90.4326', type: 'suburb' },
  { name: 'মোহাম্মদপুর', en: 'Mohammadpur', subdistrict: 'মোহাম্মদপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7658', lon: '90.3584', type: 'suburb' },
  { name: 'ফার্মগেট', en: 'Farmgate', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7561', lon: '90.3872', type: 'suburb' },
  { name: 'শাহবাগ', en: 'Shahbag', subdistrict: 'শাহবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7389', lon: '90.3957', type: 'suburb' },
  { name: 'মতিঝিল', en: 'Motijheel', subdistrict: 'মতিঝিল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7330', lon: '90.4172', type: 'suburb' },
  { name: 'কারওয়ান বাজার', en: 'Kawran Bazar', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7516', lon: '90.3934', type: 'suburb' },
  { name: 'তেজগাঁও', en: 'Tejgaon', subdistrict: 'তেজগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7639', lon: '90.3889', type: 'suburb' },
  { name: 'যাত্রাবাড়ী', en: 'Jatrabari', subdistrict: 'যাত্রাবাড়ী', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7118', lon: '90.4346', type: 'suburb' },
  { name: 'বাড্ডা', en: 'Badda', subdistrict: 'বাড্ডা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7806', lon: '90.4267', type: 'suburb' },
  { name: 'রামপুরা', en: 'Rampura', subdistrict: 'রামপুরা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7612', lon: '90.4208', type: 'suburb' },
  { name: 'মালিবাগ', en: 'Malibagh', subdistrict: 'শাহজাহানপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7487', lon: '90.4128', type: 'suburb' },
  { name: 'খিলগাঁও', en: 'Khilgaon', subdistrict: 'খিলগাঁও', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7523', lon: '90.4285', type: 'suburb' },
  { name: 'কমলাপুর', en: 'Kamalapur', subdistrict: 'মতিঝিল', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7315', lon: '90.4255', type: 'station' },
  { name: 'গাবতলী', en: 'Gabtoli', subdistrict: 'দারুস সালাম', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7844', lon: '90.3444', type: 'suburb' },
  { name: 'নিউ মার্কেট', en: 'New Market', subdistrict: 'ধানমন্ডি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7335', lon: '90.3842', type: 'commercial' },
  { name: 'লালবাগ কেল্লা', en: 'Lalbagh Fort', subdistrict: 'লালবাগ', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7188', lon: '90.3881', type: 'historic' },
  { name: 'পুরান ঢাকা', en: 'Old Dhaka', subdistrict: 'কোতোয়ালি', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7099', lon: '90.4071', type: 'suburb' },
  { name: 'আগারগাঁও', en: 'Agargaon', subdistrict: 'শেরেবাংলা নগর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7785', lon: '90.3792', type: 'suburb' },
  { name: 'শ্যামলী', en: 'Shyamoli', subdistrict: 'মোহাম্মদপুর', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7719', lon: '90.3644', type: 'suburb' },
  { name: 'কাকরাইল', en: 'Kakrail', subdistrict: 'রমনা', district: 'ঢাকা', country: 'বাংলাদেশ', lat: '23.7381', lon: '90.4086', type: 'suburb' },

  // Divisions & Major Districts
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

// Search location geocoding (supports both Bengali & English, location, thana, district, country)
app.get('/api/geocode/search', async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query q is required' });
  }
  const cleanQ = q.trim();
  const lowerQ = cleanQ.toLowerCase();

  try {
    let combinedResults = [];

    // 1. Instant Match from BD_POPULAR_PLACES dictionary
    const localMatches = BD_POPULAR_PLACES.filter(p => 
      p.name.includes(cleanQ) || 
      p.en.toLowerCase().includes(lowerQ) ||
      p.subdistrict.includes(cleanQ) ||
      p.district.includes(cleanQ)
    ).map(p => ({
      display_name: `${p.name}, ${p.subdistrict !== p.name ? p.subdistrict + ', ' : ''}${p.district}, ${p.country}`,
      name: p.name,
      subdistrict: p.subdistrict,
      district: p.district,
      country: p.country,
      lat: p.lat,
      lon: p.lon,
      type: p.type
    }));

    if (localMatches.length > 0) {
      combinedResults.push(...localMatches);
    }

    // 2. Primary Online: Nominatim with Bangladesh viewbox bias
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&limit=10&addressdetails=1&accept-language=bn,en&viewbox=88.0,20.5,92.7,26.7`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)',
          'Accept-Language': 'bn,en;q=0.9'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          data.forEach(item => {
            const addr = item.address || {};
            const thana = addr.suburb || addr.quarter || addr.neighbourhood || addr.subdistrict || '';
            const district = addr.city || addr.town || addr.county || addr.state || '';
            const country = addr.country || '';
            const itemName = item.name || item.display_name.split(',')[0];

            if (!combinedResults.some(r => r.name === itemName || (Math.abs(parseFloat(r.lat) - parseFloat(item.lat)) < 0.005 && Math.abs(parseFloat(r.lon) - parseFloat(item.lon)) < 0.005))) {
              combinedResults.push({
                display_name: item.display_name,
                name: itemName,
                subdistrict: thana,
                district: district,
                country: country,
                lat: item.lat,
                lon: item.lon,
                type: item.type || item.class || 'location'
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Nominatim search failed, trying fallback:', e.message);
    }

    // 3. Fallback: Global Nominatim search if still low results
    if (combinedResults.length < 3) {
      try {
        const globalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&limit=8&addressdetails=1&accept-language=bn,en`;
        const gRes = await fetch(globalUrl, {
          headers: {
            'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)',
            'Accept-Language': 'bn,en;q=0.9'
          }
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (Array.isArray(gData) && gData.length > 0) {
            gData.forEach(item => {
              const itemName = item.name || item.display_name.split(',')[0];
              if (!combinedResults.some(r => r.name === itemName)) {
                combinedResults.push({
                  display_name: item.display_name,
                  name: itemName,
                  subdistrict: '',
                  district: '',
                  country: '',
                  lat: item.lat,
                  lon: item.lon,
                  type: item.type || 'place'
                });
              }
            });
          }
        }
      } catch (e) {}
    }

    // 4. Fallback: Photon by Komoot
    if (combinedResults.length < 3) {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=8`;
        const pRes = await fetch(photonUrl);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData && pData.features && pData.features.length > 0) {
            pData.features.forEach(f => {
              const p = f.properties || {};
              const coords = f.geometry ? f.geometry.coordinates : [90.4125, 23.8103];
              const parts = [p.name, p.district || p.suburb, p.city || p.county, p.country].filter(Boolean);
              const pName = p.name || parts[0] || cleanQ;

              if (!combinedResults.some(r => r.name === pName)) {
                combinedResults.push({
                  display_name: parts.join(', '),
                  name: pName,
                  subdistrict: p.suburb || p.district || '',
                  district: p.city || p.county || p.state || '',
                  country: p.country || '',
                  lat: coords[1].toString(),
                  lon: coords[0].toString(),
                  type: p.type || 'place'
                });
              }
            });
          }
        }
      } catch (e) {}
    }

    res.json(combinedResults.slice(0, 10));

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
