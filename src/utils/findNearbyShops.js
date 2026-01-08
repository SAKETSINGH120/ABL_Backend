const { default: mongoose } = require("mongoose");
const Shop = require("../models/shop");


/**
 * Find nearby shops within a specified radius.
 * @param {Object} coords - User's coordinates { lat, long }
 * @param {String|ObjectId} serviceId - Service ID (string or ObjectId)
 * @param {Number} radiusInKm - Radius in kilometers (default: 20km)
 * @param {Object} extraFilter - Optional additional filters (e.g., { shopType: "veg" })
 * @returns {Promise<Array>} Array of shops within radius
 */

const findNearbyShops = async (coords, serviceId, radiusInKm = 19, extraFilter = {}) => {
    const { lat, long } = coords;

    if (!lat || !long) throw new Error("Invalid coordinates provided");

    const finalServiceId = new mongoose.Types.ObjectId(serviceId);

    const shops = await Shop.find({
        status: "active",
        serviceId: finalServiceId,
        ...extraFilter,
        location: {
            $nearSphere: {
                $geometry: {
                    type: "Point",
                    coordinates: [long, lat],
                },
                $maxDistance: radiusInKm * 1000, // convert km to meters
            },
        },
    });
    // ✅ Extra safety filter (if some invalid data slips through)
    const filtered = shops.filter((s) => {
    const [shopLong, shopLat] = s.location.coordinates;
    const dist = haversineDistance(lat, long, shopLat, shopLong); // km
    return dist <= radiusInKm;
    });

    return shops;
};
// ✅ Utility: Haversine Distance (in km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;

  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

module.exports = findNearbyShops;
