import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles.css"; // Correct relative path!

export default function TestCentreSearch() {
  const [testCentres, setTestCentres] = useState([]);
  const [postcode, setPostcode] = useState("");
  const [gender, setGender] = useState("");
  const [radius, setRadius] = useState(25);
  const [results, setResults] = useState([]);
  const [filteredCentres, setFilteredCentres] = useState([]);

  useEffect(() => {
    fetch("/test_centres.json")
      .then((res) => res.json())
      .then((data) => setTestCentres(data));
  }, []);

  const toRad = (value) => (value * Math.PI) / 180;

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSearch = async () => {
    if (!postcode || !gender || !radius) {
      alert("Please fill in all fields.");
      return;
    }

    if (radius > 500) {
      alert("Radius must be 500 miles or less.");
      return;
    }

    try {
      const userRes = await axios.get(
        `https://api.postcodes.io/postcodes/${postcode}`
      );
      const { latitude: userLat, longitude: userLon } = userRes.data.result;

      const filteredResults = [];

      for (const centre of testCentres) {
        const centrePostcode = centre["Full Address"].split(",").pop().trim();

        try {
          const centreRes = await axios.get(
            `https://api.postcodes.io/postcodes/${centrePostcode}`
          );
          const { latitude: centreLat, longitude: centreLon } =
            centreRes.data.result;

          const distance = getDistance(userLat, userLon, centreLat, centreLon);

          if (distance <= radius) {
            filteredResults.push({
              name: centre["Test Centre"],
              address: centre["Full Address"],
              distance: Math.round(distance),
              maleRate: Math.round(centre["Male Pass Rate (%)"]),
              femaleRate: Math.round(centre["Female Pass Rate (%)"]),
              passRate:
                gender.toLowerCase() === "male"
                  ? Math.round(centre["Male Pass Rate (%)"])
                  : Math.round(centre["Female Pass Rate (%)"]),
            });
          }
        } catch (err) {
          console.warn(
            `Invalid postcode for centre: ${centre["Test Centre"]} (${centrePostcode})`
          );
        }
      }

      setFilteredCentres(filteredResults);
      setResults(filteredResults);
    } catch (err) {
      console.error("Error getting your postcode data.", err);
      alert("Invalid postcode or API error.");
    }
  };

  // Update gender-specific pass rates live when gender changes
  useEffect(() => {
    if (filteredCentres.length === 0) return;

    const genderFilteredResults = filteredCentres.map((centre) => {
      const passRate =
        gender.toLowerCase() === "male"
          ? Math.round(centre.maleRate)
          : Math.round(centre.femaleRate);

      return {
        ...centre,
        passRate,
      };
    });

    setResults(genderFilteredResults);
  }, [gender, filteredCentres]);

  return (
    <div className="container">
      <h2 className="heading">Find Your Driving Test Centre</h2>

      <div className="form">
        <input
          type="text"
          placeholder="Enter your postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          className="input"
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="select"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <div className="input-with-label">
          <input
            type="number"
            placeholder="Radius"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="input small-input"
          />
          <span className="unit-label">miles</span>
        </div>
        <button onClick={handleSearch} className="button">
          Search
        </button>
      </div>

      {results.length > 0 ? (
        <div className="results">
          {results.map((res, idx) => (
            <div key={idx} className="result-card">
              <p>
                <strong>Centre:</strong> {res.name}
              </p>
              <p>
                <strong>Address:</strong> {res.address}
              </p>
              <p>
                <strong>Distance:</strong> {res.distance} miles
              </p>
              <p>
                <strong>{gender} Pass Rate:</strong> {res.passRate}%
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-results">
          No results yet. Enter details and click search.
        </p>
      )}
    </div>
  );
}
