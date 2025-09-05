import React, { useState, useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Link from '@mui/material/Link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { PossibleFragmentSpreadsRule, PossibleTypeExtensionsRule } from 'graphql';

// Register the necessary components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

// A reusable React component for displaying a collapsible row in the table.
// It shows details and charts related to a specific target-disease association.
function Row(props) {
  const { row } = props;
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Use refs to get a direct reference to the Chart.js instances.
  // This allows us to manually trigger a resize.
  const barChartRef = useRef(null);
  const radarChartRef = useRef(null);

  // Handles the tab change for switching between the bar and radar charts.
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Helper function to format strings by removing underscores and capitalizing each word.
  const formatLabel = (label) => {
    return label
      .split('_')
      .map(word => {
        if (word.toLowerCase() === 'rna') {
          return 'RNA';
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  // Defines a complete list of data types to ensure all are shown in the charts,
  // even if they have a score of 0 for a specific target.
  const allDataTypes = ["literature", "rna_expression", "genetic_association", "somatic_mutation", "known_drug", "animal_model", "affected_pathway"];

  // Use `useMemo` to memoize the chart data. This prevents recalculating the data on every
  // render unless the `row.datatypeScores` or `allDataTypes` change, improving performance.
  const chartData = useMemo(() => {
    return allDataTypes.map(type => {
      const foundScore = row.datatypeScores.find(score => score.id === type);
      return {
        name: formatLabel(type),
        value: foundScore ? foundScore.score : 0,
      };
    });
  }, [row.datatypeScores, allDataTypes]);

  // Data for the Bar Chart
  const barChartData = {
    labels: chartData.map(d => d.name),
    datasets: [{
      label: 'Association Score',
      data: chartData.map(d => d.value),
      backgroundColor: 'rgb(52, 137, 202)',
    }],
  };

  // Options for the Bar Chart
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Data Type Scores: ${row.target.approvedSymbol}`,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(3);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        title: {
          display: true,
          text: 'Association Score',
        },
        ticks: {
          callback: function (value) {
            return value.toFixed(3);
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Data Type',
        },
      }
    },
  };

  // Data for the Radar Chart
  const radarChartData = {
    labels: chartData.map(d => d.name),
    datasets: [{
      label: row.target.approvedSymbol,
      data: chartData.map(d => d.value),
      backgroundColor: 'rgba(52, 137, 202, 0.2)',
      borderColor: 'rgb(52, 137, 202)',
      borderWidth: 1,
    }],
  };

  // Options for the Radar Chart
  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Data Type Scores: ${row.target.approvedSymbol}`,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.r !== null) {
              label += context.parsed.r.toFixed(3);
            }
            return label;
          }
        }
      }
    },
    scales: {
      r: {
        angleLines: { display: false },
        suggestedMin: 0,
        suggestedMax: 1,
        ticks: {
          backdropColor: 'transparent',
          color: 'black',
          callback: function (value) {
            return value.toFixed(3);
          }
        }
      }
    },
  };

  // A single useEffect hook to handle all chart resizing needs.
  useEffect(() => {
    // Function to handle the resizing of the charts.
    const handleResize = () => {
      // Check if the row is open before attempting to resize.
      if (open) {
        if (tabValue === 0 && barChartRef.current) {
          barChartRef.current.resize();
        } else if (tabValue === 1 && radarChartRef.current) {
          radarChartRef.current.resize();
        }
      }
    };

    // Trigger an initial resize when the row opens or the tab changes.
    // We use a small timeout to ensure the Material-UI Collapse animation is complete.
    setTimeout(() => {
      handleResize();
    }, 0);

    // Add a global event listener for window resize events.
    window.addEventListener('resize', handleResize);

    // Cleanup function to remove the event listener when the component unmounts.
    // This prevents memory leaks.
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [open, tabValue]); // Dependencies ensure this hook runs when the row opens or the tab changes.

  // Construct the URL to the target page on the Open Targets Platform.
  //Note: 'target.id' instead of 'target.approvedName' link actually links to a live web page
  const targetUrl = `https://platform.opentargets.org/target/${row.target.approvedName}`;

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell sx={{ padding: '0px' }}>
          <IconButton
            aria-label="expand row"
            size="medium"
            onClick={() => setOpen(!open)}
          >
            <Box
              component="span"
              sx={{
                width: 48,
                height: 48,
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'normal',
                fontSize: '1.5rem'
              }}
            >
              {open ? '-' : '+'}
            </Box>
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Link href={targetUrl} target="_blank" rel="noopener">
            {row.target.approvedSymbol}
          </Link>
        </TableCell>
        <TableCell>{row.target.approvedName}</TableCell>
        <TableCell>{row.score.toFixed(3)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1, p: 2, padding: 0, }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="chart tabs">
                <Tab label="Bar Chart" />
                <Tab label="Radar Chart" />
              </Tabs>
              {tabValue === 0 && (
                <Box class="chartContainer" sx={{ p: 2, minHeight: '300px', minWidth: '0px', position: 'relative', margin: 'auto' }}>
                  {/* Pass the ref to the Bar component to get its instance. */}
                  <Bar ref={barChartRef} options={barChartOptions} data={barChartData} sx={{ minWidth:'0px' }} />
                </Box>
              )}
              {tabValue === 1 && (
                <Box class="chartContainer" sx={{ p: 2, minHeight: '300px', minWidth: '0px' }}>
                  {/* Pass the ref to the Radar component to get its instance. */}
                  <Radar ref={radarChartRef} options={radarChartOptions} data={radarChartData} />
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

// The main App component that fetches data and renders the table.
export default function App() {
  const [targets, setTargets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // The GraphQL query string to fetch a list of targets associated with lung carcinoma (EFO_0001071).
  const query = `
    query lungCarcinomaAssociatedTargets {
      disease(efoId:"EFO_0001071") {
        associatedTargets (page:{index:0, size:10}) {
          rows {
            target {
              id
              approvedSymbol
              approvedName
            }
            score
            datatypeScores {
              id
              score
            }
          }
        }
      }
    }
  `;

  // `useEffect` hook to perform the data fetching side effect.
  // It runs once when the component mounts, as specified by the empty dependency array.
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        // Check if the expected data path exists before setting the state.
        if (result.data?.disease?.associatedTargets?.rows) {
          setTargets(result.data.disease.associatedTargets.rows);
        } else {
          throw new Error('Data structure from API is not as expected.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [query]);

  // Conditional rendering based on the loading and error states.
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, color: 'gray.600' }}>
          Fetching data from Open Targets...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Error fetching data: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', minWidth:'0px' }}>
      <TableContainer component={Paper} sx={{ borderRadius: '0px', boxShadow: 2, minWidth:'0px' }}>
        <Table aria-label="collapsible table">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell sx={{ fontWeight: 'bold' }}>Approved Symbol</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Approved Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Association Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {targets.length > 0 ? (
              targets.map((row) => (
                <Row key={row.target.id} row={row} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body1" align="center" sx={{ p: 4, color: 'text.secondary' }}>
                    No data available.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
