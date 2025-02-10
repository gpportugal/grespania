import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import leroyMerlin from "./assets/leroyMerlin.png";
import loveTiles from "./assets/loveTiles.png";
import margres from "./assets/margres.png";

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columnMap, setColumnMap] = useState(new Map());
  const [filters, setFilters] = useState({});
  const [C1, setC1] = useState();
  const [PVP_Caixa, setPVPCaixa] = useState();
  const [PVP_m2, setPVPM2] = useState();
  const [Codice, setCodice] = useState();
  const [UnVenda, setUnVenda] = useState();
  const [m2Caixa, setm2Caixa] = useState();

  useEffect(() => {
    fetchSheetData();
  }, []);

  const processData = useCallback((data) => {
    const newMap = new Map();
    const adjMap = new Map();
    const headers = data[0] || [];

    // Process unique values for specific columns
    headers.forEach((header, columnIndex) => {
      if ([1, 2, 3, 4, 5, 7, 8, 10, 15].includes(columnIndex)) {
        const uniqueValues = [...new Set(data.slice(1).map(row => row[columnIndex]))];
        adjMap.set(header, uniqueValues);
      }
    });

    // Initialize default values
    newMap.set('Marca', []);
    newMap.set('Série', []);
    newMap.set('Formato', []);
    newMap.set('Descrição', []);
    newMap.set('Grupo Preço', []);
    newMap.set('Preço', []);
    newMap.set('UM Preço', []);
    newMap.set('m2_Caixa', []);
    newMap.set('Codice EAN/UPC', []);

    // Update map with unique values and "Preço" adjustments
    adjMap.forEach((value, key) => {
      if (key === 'Preço') {
        value = value.map(val => val + ' €');
        newMap.set(key, value);
      } else {
        newMap.set(key, value);
      }
    });

    setColumnMap(newMap);
  }, []);

  const fetchSheetData = async () => {
    try {
      const response = await fetch("https://api-sheets-687f24987b48.herokuapp.com/");
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      const sheetData = result.values || [];
      setData(sheetData);
      processData(sheetData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setC1(null);
    setPVPCaixa(null);
    setPVPM2(null);
    setCodice(null);
    setUnVenda(null);
    setm2Caixa(null);
  };

  const handleSelectChange = (header, value) => {
    if(header !== "Margem"){
      setFilters(prev => ({
        ...prev,
        [header]: value,
      }));
    }
    setC1(null);
    setPVPCaixa(null);
    setPVPM2(null);
    setCodice(null);
    handleCalc();
  };

  const handleCalc = () => {
    let c = 0;
    let options = document.getElementsByClassName("select-options");
    Array.from(options).slice(0, -4).forEach((option) => { 
      console.log(option.value);
      if (option.value === "0" || option.value === "") {
        c = 1;
      }
    });
    if (c === 0) {
      let codice = getFilteredOptionsForColumn("Codice EAN/UPC");
      setCodice(codice[0]);
      let unVenda = getFilteredOptionsForColumn("UM Preço");
      setUnVenda(unVenda[0]);
      let m2Caixa = getFilteredOptionsForColumn("m2_Caixa");
      setm2Caixa(m2Caixa[0]);
      let preco = parseFloat(options[5].value.replace(/\s+/g, "").replace(',', '.'));
      let un = unVenda[0];
      console.log(m2Caixa[0]);
      let m2 = parseFloat(m2Caixa[0].replace(',', '.'));
      let tempC1;
      if (un === "PC") {
        tempC1 = 0.7 * preco;
      } else if (un === "M2") {
        tempC1 = (preco * m2) * 0.7;
      }
      tempC1 = parseFloat(tempC1.toFixed(2));
      tempC1 = tempC1.toString().replace('.', ',') + " €";
      setC1(tempC1);

      let marg = parseFloat(options[9].value);
      tempC1 = parseFloat(tempC1.replace(" €", "").replace(',', '.'));
      let tempPVPCaixa = (tempC1 * 1.23) / (100 - marg) * 100;
      tempPVPCaixa = parseFloat(tempPVPCaixa.toFixed(2));
      tempPVPCaixa = tempPVPCaixa.toString().replace('.', ',') + " €";
      setPVPCaixa(tempPVPCaixa);

      if (un === "PC") {
        setPVPM2(tempPVPCaixa);
      } else if (un === "M2") {
        tempPVPCaixa = parseFloat(tempPVPCaixa.replace(" €", "").replace(',', '.'));
        let tempPVPm2 = tempPVPCaixa / m2;
        tempPVPm2 = parseFloat(tempPVPm2.toFixed(2));
        tempPVPm2 = tempPVPm2.toString().replace('.', ',') + " €";
        setPVPM2(tempPVPm2);
      }
    }
  };

  const getFilteredOptionsForColumn = useMemo(() => {
    return (header) => {
      const columnIndex = data[0].indexOf(header);

      const filteredRows = data.slice(1).filter(row => {
        return Object.entries(filters).every(([filterHeader, filterValue]) => {
          if (filterHeader === header || !filterValue) return true;
          const filterColumnIndex = data[0].indexOf(filterHeader);
          return row[filterColumnIndex] === filterValue;
        });
      });

      return [...new Set(filteredRows.map(row => row[columnIndex]))].sort((a, b) => {
        const numA = Number(String(a).replace(/[^\d.-]/g, ''));
        const numB = Number(String(b).replace(/[^\d.-]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return String(a).localeCompare(String(b));
      });
    };
  }, [data, filters]);

  const headers = Array.from(columnMap.keys());

  const getHeaderLabel = (header) => {
    switch (header) {
      case 'Descrição':
        return 'Designação';
      case 'Preço':
        return 'Preço Tabela';
      case 'UM Preço':
        return 'Unidade de Venda';
      default:
        return header;
    }
  };

  return (
    <>
      <div className="painel">
        <h1>Tabela Grespanaria(Love/Margres/Kerlite/Linea)2025</h1>

        {loading && <p>Carregando dados...</p>}
        {error && <p>Erro: {error}</p>}

        {!loading && !error && (
          <>
            <div className="container">
              {headers.map((header, headerIndex) => (
                <div key={header}>
                  <p>{getHeaderLabel(header)}</p>
                  {headerIndex === headers.length - 1 || headerIndex === headers.length - 2 || headerIndex === headers.length - 3 ? (
                    <input
                      type="text"
                      className="select-options"
                      value={headerIndex === headers.length - 1 ? (Codice || ''):(headerIndex === headers.length - 2 ?(m2Caixa || ""):( UnVenda || ""))}
                      readOnly
                    />
                  ) : (
                    <>
                      {headerIndex === 0 || filters[headers[headerIndex - 1]] ? (
                        <select
                          className="select-options"
                          onChange={(e) => handleSelectChange(header, e.target.value)}
                          value={filters[header] || ''}
                        >
                          <option value="">{getHeaderLabel(header)}</option>
                          {getFilteredOptionsForColumn(header).map((value, index) => (
                            <option key={index} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select className="select-options" disabled>
                          <option value="">{getHeaderLabel(header)}</option>
                        </select>
                      )}
                    </>
                  )}
                </div>
              ))}
              <div >
                <p>Margem Pretendida</p>
                <select name="Lucro"
                  className='select-options'
                  onChange={(e) => handleSelectChange("Margem", e.target.value)}
                >
                  <option value="30">30</option>
                  <option value="32">32</option>
                  <option value="33">33</option>
                  <option value="31">31</option>
                  <option value="34">34</option>
                  <option value="35">35</option>
                  <option value="36">36</option>
                  <option value="37">37</option>
                  <option value="38">38</option>
                  <option value="39">39</option>
                  <option value="40">40</option>
                </select>
              </div>
            </div>
            <div className='container3'>
              <div>
                <p>C1:</p>
                <div className='resposta'>
                  <p id="c1">{C1}</p>
                </div>
              </div>
              <div >
                <p>PVP Caixa:</p>
                <div className='resposta'>
                  <p id="pvp_caixa">{PVP_Caixa}</p>
                </div>
              </div>
              <div >
                <p>PVP m2:</p>
                <div className='resposta'>
                  <p id="pvp_m2">{PVP_m2}</p>
                </div>
              </div>
              <div className='table-container'>
                <button className='resposta' onClick={clearFilters}>Limpar Opções</button>
              </div>
            </div>
          </>
        )}
      </div>
      <br /><br /><br />
      <footer className='painel'>
        <div className='foot'>
          <img src={leroyMerlin} className='ley' />
          <img src={loveTiles} className='love' />
          <img src={margres} className='margres' />
        </div>
      </footer>
    </>
  );
}

export default App;
