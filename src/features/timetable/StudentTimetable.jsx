import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { timetableConfig } from '../../config';
import Spinner from '../../components/ui/Spinner';
import * as XLSX from 'xlsx';

const StudentTimetable = () => {
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [workbook, setWorkbook] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [timetableData, setTimetableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    const fetchTimetableUrl = async () => {
      try {
        const timetableRef = doc(db, timetableConfig.collection, timetableConfig.document);
        const docSnap = await getDoc(timetableRef);

        if (docSnap.exists() && docSnap.data().fileUrl) {
          setFileUrl(docSnap.data().fileUrl);
        } else {
          setError('The master timetable has not been uploaded by an admin yet.');
        }
      } catch (err) {
        console.error('Error fetching timetable URL:', err);
        setError('Could not fetch the timetable. Please try again later.');
      }
      setLoading(false);
    };

    fetchTimetableUrl();
  }, []);

  useEffect(() => {
    if (!fileUrl) return;

    setLoading(true);

    fetch(fileUrl)
      .then(res => res.arrayBuffer())
      .then(data => {
        const wb = XLSX.read(data, { type: 'array' });

        const firstSheetName = wb.SheetNames[0];
        const worksheet = wb.Sheets[firstSheetName];

        // Convert the first sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        setWorkbook(wb);
        setTimetableData(jsonData);

        // Extract unique sections from the "Section" column (case insensitive)
        const sectionSet = new Set();
        jsonData.forEach(row => {
          if (row.Section) {
            sectionSet.add(row.Section.toString().trim());
          }
        });
        const uniqueSections = Array.from(sectionSet);
        setSections(uniqueSections);
        setSelectedSection(uniqueSections[0] || '');

        setLoading(false);
      })
      .catch(err => {
        console.error('Error reading Excel file:', err);
        setError('Failed to read the timetable file.');
        setLoading(false);
      });
  }, [fileUrl]);

  useEffect(() => {
    if (!selectedSection || !timetableData.length) {
      setFilteredData([]);
      return;
    }

    // Filter rows where Section matches selectedSection (case insensitive)
    const filtered = timetableData.filter(
      row => row.Section && row.Section.toString().trim().toLowerCase() === selectedSection.toLowerCase()
    );

    setFilteredData(filtered);
  }, [selectedSection, timetableData]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner size="h-10 w-10" color="border-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-slate-400 py-12">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-cyan-800 p-8 rounded-xl max-w-7xl mx-auto shadow-lg">
      <h2 className="text-4xl font-extrabold text-cyan-400 mb-8 text-center tracking-wide drop-shadow-lg">
        Master Timetable
      </h2>

      {/* Section Selector */}
      <div className="mb-8 flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4">
        <label
          htmlFor="section-select"
          className="text-white font-semibold text-lg select-none"
        >
          Select your section:
        </label>
        <select
          id="section-select"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="px-4 py-2 rounded-md border border-cyan-400 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
        >
          {sections.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>
      </div>

      {/* Timetable Table */}
      {filteredData.length === 0 ? (
        <p className="text-cyan-200 text-center text-xl mt-12">
          No timetable data available for this section.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-xl border border-cyan-600">
          <table className="min-w-full border-collapse text-white">
            <thead className="bg-cyan-700 sticky top-0 shadow-md">
              <tr>
                {Object.keys(filteredData[0]).map((key) => (
                  <th
                    key={key}
                    className="px-6 py-3 text-left font-semibold text-cyan-100 uppercase tracking-wide select-none whitespace-nowrap"
                    style={{ textShadow: '0 0 2px rgb(22 211 174 / 0.6)' }}
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors duration-300 ${
                    idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900'
                  } hover:bg-cyan-900 cursor-default`}
                >
                  {Object.keys(row).map((col) => (
                    <td
                      key={col}
                      className="px-6 py-4 align-top whitespace-pre-wrap break-words"
                      style={{ textShadow: '0 0 1px rgb(0 0 0 / 0.5)' }}
                    >
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;
