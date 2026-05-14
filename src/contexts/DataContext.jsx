import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [secteurs, setSecteurs] = useState([]);
  const [parcelles, setParcelles] = useState([]);
  const [varietes, setVarietes] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [s, p, v, e] = await Promise.all([
        client.get('/secteurs/'),
        client.get('/parcelles/'),
        client.get('/varietes/'),
        client.get('/rh/employes/'),
      ]);
      setSecteurs(s.data);
      setParcelles(p.data);
      setVarietes(v.data);
      setEmployes(e.data);
    } finally {
      setDataLoaded(true);
    }
  };

  const refreshSecteurs = async () => {
    const res = await client.get('/secteurs/');
    setSecteurs(res.data);
  };
  const refreshParcelles = async () => {
    const res = await client.get('/parcelles/');
    setParcelles(res.data);
  };
  const refreshVarietes = async () => {
    const res = await client.get('/varietes/');
    setVarietes(res.data);
  };
  const refreshEmployes = async () => {
    const res = await client.get('/rh/employes/');
    setEmployes(res.data);
  };

  return (
    <DataContext.Provider value={{
      secteurs, parcelles, varietes, employes, dataLoaded,
      refreshSecteurs, refreshParcelles, refreshVarietes, refreshEmployes,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
