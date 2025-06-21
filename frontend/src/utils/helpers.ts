import { Match, Game } from '../types';

// Date formatting utilities
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateStr: string, timeStr?: string): string => {
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  if (timeStr) {
    return `${formattedDate} at ${timeStr}`;
  }
  
  return formattedDate;
};

export const formatTime = (timeStr: string): string => {
  // Convert 24-hour format to 12-hour format
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Game result utilities
export const getGameResultDisplay = (result: string | null): string => {
  switch (result) {
    case '1-0':
      return '1-0';
    case '0-1':
      return '0-1';
    case '1/2-1/2':
      return '½-½';
    default:
      return '-';
  }
};

export const getGameResultPoints = (result: string | null, isWhite: boolean): number => {
  switch (result) {
    case '1-0':
      return isWhite ? 1 : 0;
    case '0-1':
      return isWhite ? 0 : 1;
    case '1/2-1/2':
      return 0.5;
    default:
      return 0;
  }
};

// Match utilities
export const calculateMatchScore = (games: Game[]): { whiteScore: number; blackScore: number } => {
  let whiteScore = 0;
  let blackScore = 0;

  games.forEach(game => {
    whiteScore += getGameResultPoints(game.result, true);
    blackScore += getGameResultPoints(game.result, false);
  });

  return { whiteScore, blackScore };
};

export const getMatchResult = (match: Match): string => {
  if (match.status !== 'completed') return '-';
  
  if (match.white_score > match.black_score) {
    return `${match.white_score}-${match.black_score}`;
  } else if (match.black_score > match.white_score) {
    return `${match.black_score}-${match.white_score}`;
  } else {
    return `${match.white_score}-${match.black_score}`;
  }
};

// Status utilities
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'scheduled':
    case 'upcoming':
      return 'text-blue-600 bg-blue-100';
    case 'in_progress':
    case 'active':
      return 'text-yellow-600 bg-yellow-100';
    case 'completed':
      return 'text-green-600 bg-green-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'upcoming':
      return 'Upcoming';
    case 'active':
      return 'Active';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

// Rating utilities
export const getRatingColor = (rating: number): string => {
  if (rating >= 2400) return 'text-purple-600 font-bold';
  if (rating >= 2200) return 'text-red-600 font-semibold';
  if (rating >= 2000) return 'text-orange-600 font-semibold';
  if (rating >= 1800) return 'text-blue-600';
  if (rating >= 1600) return 'text-green-600';
  return 'text-gray-600';
};

export const getRatingTitle = (rating: number): string => {
  if (rating >= 2400) return 'Master';
  if (rating >= 2200) return 'Expert';
  if (rating >= 2000) return 'Class A';
  if (rating >= 1800) return 'Class B';
  if (rating >= 1600) return 'Class C';
  if (rating >= 1400) return 'Class D';
  return 'Novice';
};

// Validation utilities
export const validatePlayerName = (name: string): string | null => {
  if (!name.trim()) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  if (name.length > 50) return 'Name must be less than 50 characters';
  return null;
};

export const validateRating = (rating: number): string | null => {
  if (rating < 0) return 'Rating cannot be negative';
  if (rating > 3000) return 'Rating cannot exceed 3000';
  if (!Number.isInteger(rating)) return 'Rating must be a whole number';
  return null;
};

export const validateTeamName = (name: string): string | null => {
  if (!name.trim()) return 'Team name is required';
  if (name.length < 3) return 'Team name must be at least 3 characters';
  if (name.length > 30) return 'Team name must be less than 30 characters';
  return null;
};

// Sorting utilities
export const sortPlayersByRating = <T extends { rating: number }>(players: T[]): T[] => {
  return [...players].sort((a, b) => b.rating - a.rating);
};

export const sortPlayersByPosition = <T extends { position: number }>(players: T[]): T[] => {
  return [...players].sort((a, b) => a.position - b.position);
};

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

// Board color utilities
export const getBoardColor = (boardNumber: number, teamIsWhite: boolean): 'white' | 'black' => {
  // Board 1 and 3: team color, Board 2 and 4: opposite color
  const isOddBoard = boardNumber % 2 === 1;
  return (isOddBoard && teamIsWhite) || (!isOddBoard && !teamIsWhite) ? 'white' : 'black';
};

// Performance calculation
export const calculatePerformanceRating = (
  playerRating: number,
  opponentRatings: number[],
  scores: number[]
): number => {
  if (opponentRatings.length !== scores.length) return playerRating;
  
  const averageOpponentRating = opponentRatings.reduce((sum, rating) => sum + rating, 0) / opponentRatings.length;
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const percentage = totalScore / scores.length;
  
  // Simplified performance rating calculation
  const performanceDelta = (percentage - 0.5) * 400;
  return Math.round(averageOpponentRating + performanceDelta);
};

// Local storage utilities
export const setLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};