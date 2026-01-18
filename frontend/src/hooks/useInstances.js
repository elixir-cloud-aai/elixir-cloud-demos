import { useState, useEffect } from 'react';
import instanceService from '../services/instanceService';

const useInstances = () => {
  const [state, setState] = useState({
    instances: [],
    loading: true,
    error: null,
    lastUpdate: null
  });

  useEffect(() => {
    const handleUpdate = (newState) => {
      setState(newState);
    };
    instanceService.addListener(handleUpdate);
    const initialState = instanceService.getHealthyInstances();
    setState(initialState);
    return () => {
      instanceService.removeListener(handleUpdate);
    };
  }, []);
  const refresh = () => {
    instanceService.refresh();
  };

  return {
    instances: state.instances,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    refresh,
    hasInstances: state.instances.length > 0
  };
};

export default useInstances;
