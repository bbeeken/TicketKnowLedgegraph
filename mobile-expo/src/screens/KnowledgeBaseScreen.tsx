import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, BookOpen, Wrench, HelpCircle, Play, Eye, Clock, ThumbsUp, Filter } from 'lucide-react-native';
// Workaround for lucide-react-native typings mismatch in this project setup
const EyeIcon = Eye as any;
const ClockIcon = Clock as any;
const ThumbsUpIcon = ThumbsUp as any;
const WrenchIcon = Wrench as any;
const PlayIcon = Play as any;
const SearchIcon = Search as any;
const FilterIcon = Filter as any;

const { width, height } = Dimensions.get('window');

interface KnowledgeArticle {
  id: number;
  title: string;
  category: string;
  subcategory?: string;
  content: string;
  summary: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  helpful: number;
  notHelpful: number;
  views: number;
  featured: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedReadTime: number;
  relatedArticles: number[];
  attachments?: {
    type: 'image' | 'video' | 'document';
    url: string;
    filename: string;
  }[];
}

interface TroubleshootingGuide {
  id: number;
  title: string;
  problem: string;
  solution: string;
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tools: string[];
  steps: string[];
  prerequisites: string[];
  warnings: string[];
  successRate: number;
  timeSaved: number;
  categories: string[];
  tags: string[];
  videoUrl?: string;
  images: string[];
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  helpful: number;
  views: number;
  featured: boolean;
}

interface VideoTutorial {
  id: number;
  title: string;
  description: string;
  duration: number;
  thumbnailUrl: string;
  videoUrl: string;
  category: string;
  tags: string[];
  instructor: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  views: number;
  rating: number;
  transcript?: string;
  chapters: {
    title: string;
    timestamp: number;
  }[];
}

// Mock data
const mockArticles: KnowledgeArticle[] = [
  {
    id: 1,
    title: 'Complete Guide to Fuel System Maintenance',
    category: 'Fuel Systems',
    subcategory: 'Maintenance',
    content: `
# Fuel System Maintenance Guide

## Overview
Regular maintenance of fuel systems is crucial for preventing costly downtime and ensuring reliable operations.

## Key Components
- Fuel pumps and dispensers
- Underground storage tanks
- Piping and valves
- Leak detection systems
- Vapor recovery systems

## Maintenance Schedule
- Daily: Visual inspections
- Weekly: Performance testing
- Monthly: Leak detection checks
- Quarterly: Full system diagnostics
- Annually: Professional inspection

## Common Issues and Solutions

### Issue: Slow Fuel Flow
**Symptoms:** Customers report slow dispensing
**Causes:** Clogged filters, weak pump, air in lines
**Solutions:**
1. Check and replace fuel filters
2. Test pump pressure
3. Bleed air from lines
4. Clean dispenser nozzles

### Issue: Fuel Quality Problems
**Symptoms:** Engine performance issues, contamination
**Causes:** Water contamination, microbial growth
**Solutions:**
1. Regular fuel testing
2. Tank cleaning schedule
3. Additive treatments
4. Filtration system maintenance
    `,
    summary: 'Comprehensive guide covering fuel system components, maintenance schedules, and troubleshooting common issues.',
    tags: ['fuel', 'maintenance', 'pumps', 'tanks', 'filters'],
    author: 'John Smith',
    createdAt: '2025-08-01',
    updatedAt: '2025-09-01',
    helpful: 45,
    notHelpful: 2,
    views: 234,
    featured: true,
    difficulty: 'Intermediate',
    estimatedReadTime: 15,
    relatedArticles: [2, 3],
    attachments: [
      { type: 'image', url: '/images/fuel-system-diagram.png', filename: 'fuel-system-diagram.png' },
      { type: 'document', url: '/docs/fuel-maintenance-checklist.pdf', filename: 'fuel-maintenance-checklist.pdf' },
    ],
  },
  {
    id: 2,
    title: 'POS Terminal Troubleshooting',
    category: 'Point of Sale',
    subcategory: 'Hardware',
    content: `
# POS Terminal Troubleshooting Guide

## Common Issues

### Terminal Won't Start
1. Check power connection
2. Verify outlet functionality
3. Reset circuit breaker
4. Contact technical support if persistent

### Transaction Declines
1. Verify internet connection
2. Check card reader
3. Restart terminal
4. Process manually if needed

### Screen Freezes
1. Wait 30 seconds for auto-restart
2. Force restart using power button
3. Clear cache if available
4. Factory reset as last resort
    `,
    summary: 'Step-by-step troubleshooting for common POS terminal issues.',
    tags: ['pos', 'terminal', 'payment', 'hardware'],
    author: 'Sarah Johnson',
    createdAt: '2025-08-15',
    updatedAt: '2025-08-15',
    helpful: 32,
    notHelpful: 1,
    views: 189,
    featured: false,
    difficulty: 'Beginner',
    estimatedReadTime: 8,
    relatedArticles: [1, 4],
  },
];

const mockGuides: TroubleshootingGuide[] = [
  {
    id: 1,
    title: 'Reset Fuel Pump Circuit Breaker',
    problem: 'Fuel pump not responding to card swipe or displaying error messages',
    solution: 'Reset the circuit breaker and check electrical connections',
    estimatedTime: '5 minutes',
    difficulty: 'Easy',
    tools: ['Circuit breaker key', 'Flashlight', 'Multimeter (optional)'],
    steps: [
      'Locate the fuel pump circuit breaker panel (usually near the pump or in the station office)',
      'Identify the breaker labeled "Fuel Pump" or "Dispenser"',
      'Switch the breaker to OFF position',
      'Wait 30 seconds to discharge any residual electricity',
      'Switch back to ON position',
      'Test the fuel pump by attempting a transaction',
      'If issue persists, check for loose wiring or contact electrician',
    ],
    prerequisites: ['Basic electrical safety knowledge', 'Access to circuit breaker panel'],
    warnings: [
      'Always wear appropriate PPE when working with electrical equipment',
      'Do not attempt if you are not comfortable with electrical work',
      'If circuit breaker trips repeatedly, there may be a serious electrical issue',
    ],
    successRate: 85,
    timeSaved: 45,
    categories: ['Fuel Systems', 'Electrical'],
    tags: ['fuel pump', 'circuit breaker', 'electrical', 'reset'],
    images: ['/images/circuit-breaker-location.jpg', '/images/breaker-reset.jpg'],
  },
  {
    id: 2,
    title: 'Clear POS Terminal Cache and Restart',
    problem: 'POS terminal running slowly, freezing, or displaying error messages',
    solution: 'Clear application cache and perform a clean restart',
    estimatedTime: '3 minutes',
    difficulty: 'Easy',
    tools: ['POS terminal access code'],
    steps: [
      'Access the terminal settings menu using the manager code',
      'Navigate to System > Storage or Applications > Cache',
      'Select "Clear Cache" or "Clear Temporary Files"',
      'Confirm the action when prompted',
      'Return to main menu and select "Restart" or "Reboot"',
      'Wait for terminal to fully restart (usually 1-2 minutes)',
      'Test transaction processing to verify functionality',
    ],
    prerequisites: ['Manager access code for terminal'],
    warnings: [
      'Clearing cache will log out all users',
      'Some custom settings may need to be reconfigured',
      'Do not interrupt the restart process',
    ],
    successRate: 92,
    timeSaved: 30,
    categories: ['Point of Sale', 'Software'],
    tags: ['pos', 'cache', 'restart', 'performance'],
    images: ['/images/pos-cache-clear.jpg', '/images/pos-restart.jpg'],
  },
];

const mockFAQs: FAQ[] = [
  {
    id: 1,
    question: 'How do I report a fuel pump that is not working?',
    answer: 'Use the self-service portal to submit a ticket with photos of the pump and error messages. Include the pump number and exact location.',
    category: 'Fuel Systems',
    tags: ['fuel pump', 'reporting', 'ticket'],
    helpful: 28,
    views: 156,
    featured: true,
  },
  {
    id: 2,
    question: 'What should I do if the POS terminal shows "Network Error"?',
    answer: 'First, check the internet connection by attempting to browse a website. If connection is good, restart the terminal. If the error persists, submit a ticket.',
    category: 'Point of Sale',
    tags: ['pos', 'network', 'error'],
    helpful: 35,
    views: 203,
    featured: true,
  },
];

const mockVideos: VideoTutorial[] = [
  {
    id: 1,
    title: 'Fuel System Emergency Shutdown Procedure',
    description: 'Learn the proper steps to safely shut down fuel systems during emergencies.',
    duration: 420,
    thumbnailUrl: '/videos/fuel-shutdown-thumbnail.jpg',
    videoUrl: '/videos/fuel-shutdown.mp4',
    category: 'Safety',
    tags: ['fuel', 'safety', 'emergency', 'shutdown'],
    instructor: 'Mike Rodriguez',
    difficulty: 'Intermediate',
    views: 89,
    rating: 4.8,
    chapters: [
      { title: 'Introduction', timestamp: 0 },
      { title: 'Preparation', timestamp: 45 },
      { title: 'Shutdown Steps', timestamp: 120 },
      { title: 'Verification', timestamp: 300 },
      { title: 'Post-Shutdown Procedures', timestamp: 360 },
    ],
  },
];

export default function KnowledgeBaseScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<TroubleshootingGuide | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    'Fuel Systems',
    'Point of Sale',
    'Climate Control',
    'Security',
    'Electrical',
    'Plumbing',
    'Equipment',
    'Safety',
    'Maintenance',
  ];

  const filteredArticles = mockArticles.filter(article => {
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || article.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const filteredGuides = mockGuides.filter(guide => {
    const matchesSearch = !searchQuery ||
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory ||
      guide.categories.some(cat => cat === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = mockFAQs.filter(faq => {
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleArticlePress = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  const handleGuidePress = (guide: TroubleshootingGuide) => {
    setSelectedGuide(guide);
    setModalVisible(true);
  };

  const handleHelpful = (type: 'article' | 'faq', id: number, helpful: boolean) => {
    Alert.alert(
      'Thank you for your feedback!',
      'Your input helps us improve our knowledge base.',
      [{ text: 'OK' }]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': case 'Beginner': return '#48BB78';
      case 'Medium': case 'Intermediate': return '#ED8936';
      case 'Hard': case 'Advanced': return '#F56565';
      default: return '#A0AEC0';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderArticleCard = ({ item }: { item: KnowledgeArticle }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleArticlePress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        {item.featured && (
          <View style={[styles.categoryBadge, { backgroundColor: '#805AD5' }]}>
            <Text style={styles.categoryText}>Featured</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.cardSummary} numberOfLines={3}>
        {item.summary}
      </Text>

      <View style={styles.tagsContainer}>
        {item.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <EyeIcon size={14} color="#718096" />
            <Text style={styles.statText}>{item.views}</Text>
          </View>
          <View style={styles.stat}>
            <ClockIcon size={14} color="#718096" />
            <Text style={styles.statText}>{item.estimatedReadTime} min</Text>
          </View>
        </View>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </View>
      </View>

      <View style={styles.authorRow}>
        <Text style={styles.authorText}>By {item.author}</Text>
        <View style={styles.helpfulStat}>
          <ThumbsUpIcon size={14} color="#48BB78" />
          <Text style={styles.helpfulText}>{item.helpful}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGuideCard = ({ item }: { item: TroubleshootingGuide }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleGuidePress(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </View>
      </View>

      <Text style={styles.problemText}>
        <Text style={styles.problemLabel}>Problem: </Text>
        {item.problem}
      </Text>

      <View style={styles.guideStats}>
        <View style={styles.stat}>
          <ClockIcon size={14} color="#718096" />
          <Text style={styles.statText}>{item.estimatedTime}</Text>
        </View>
        <View style={styles.stat}>
          <WrenchIcon size={14} color="#718096" />
          <Text style={styles.statText}>{item.tools.length} tools</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statText}>{item.successRate}% success</Text>
        </View>
      </View>

      <View style={styles.tagsContainer}>
        {item.tags.slice(0, 4).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Mark as Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
          <Text style={styles.secondaryButtonText}>Still Need Help</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFAQCard = ({ item }: { item: FAQ }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        {item.featured && (
          <View style={[styles.categoryBadge, { backgroundColor: '#805AD5' }]}>
            <Text style={styles.categoryText}>Featured</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardTitle}>
        {item.question}
      </Text>

      <Text style={styles.cardSummary}>
        {item.answer}
      </Text>

      <View style={styles.tagsContainer}>
        {item.tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.faqFooter}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <EyeIcon size={14} color="#718096" />
            <Text style={styles.statText}>{item.views} views</Text>
          </View>
          <View style={styles.stat}>
            <ThumbsUpIcon size={14} color="#48BB78" />
            <Text style={styles.statText}>{item.helpful} helpful</Text>
          </View>
        </View>

        <View style={styles.faqActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.smallButton]}
            onPress={() => handleHelpful('faq', item.id, true)}
          >
            <ThumbsUpIcon size={16} color="#48BB78" />
            <Text style={[styles.actionButtonText, { marginLeft: 4 }]}>Helpful</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.smallButton, styles.secondaryButton]}
            onPress={() => handleHelpful('faq', item.id, false)}
          >
            <Text style={styles.secondaryButtonText}>Not Helpful</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderVideoCard = ({ item }: { item: VideoTutorial }) => (
    <TouchableOpacity style={styles.videoCard}>
      <View style={styles.videoThumbnail}>
        <View style={styles.playButton}>
          <PlayIcon size={24} color="#FFFFFF" fill="#FFFFFF" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      </View>

      <View style={styles.videoInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.cardSummary} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.videoMeta}>
          <Text style={styles.authorText}>{item.instructor}</Text>
          <View style={styles.stat}>
            <EyeIcon size={14} color="#718096" />
            <Text style={styles.statText}>{item.views}</Text>
          </View>
        </View>

        <View style={styles.videoTags}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.watchButton}>
          <PlayIcon size={16} color="#FFFFFF" />
          <Text style={styles.watchButtonText}>Watch Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <FlatList
            data={filteredArticles}
            renderItem={renderArticleCard}
            keyExtractor={(item: KnowledgeArticle) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      case 1:
        return (
          <FlatList
            data={filteredGuides}
            renderItem={renderGuideCard}
            keyExtractor={(item: TroubleshootingGuide) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      case 2:
        return (
          <FlatList
            data={filteredFAQs}
            renderItem={renderFAQCard}
            keyExtractor={(item: FAQ) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      case 3:
        return (
          <FlatList
            data={mockVideos}
            renderItem={renderVideoCard}
            keyExtractor={(item: VideoTutorial) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Knowledge Base</Text>
        <Text style={styles.headerSubtitle}>
          Find solutions, guides, and tutorials for common issues
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <SearchIcon size={20} color="#718096" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles, guides, FAQs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <FilterIcon size={20} color="#4A5568" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedCategory && styles.activeFilterChip]}
                onPress={() => setSelectedCategory('')}
              >
                <Text style={[styles.filterChipText, !selectedCategory && styles.activeFilterChipText]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[styles.filterChip, selectedCategory === category && styles.activeFilterChip]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === category && styles.activeFilterChipText]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Difficulty:</Text>
            <View style={styles.difficultyFilters}>
              {['Beginner', 'Intermediate', 'Advanced'].map(difficulty => (
                <TouchableOpacity
                  key={difficulty}
                  style={[styles.filterChip, selectedDifficulty === difficulty && styles.activeFilterChip]}
                  onPress={() => setSelectedDifficulty(selectedDifficulty === difficulty ? '' : difficulty)}
                >
                  <Text style={[styles.filterChipText, selectedDifficulty === difficulty && styles.activeFilterChipText]}>
                    {difficulty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.tabsContainer}>
        {[
          { label: `Articles (${filteredArticles.length})`, icon: BookOpen },
          { label: `Guides (${filteredGuides.length})`, icon: Wrench },
          { label: `FAQs (${filteredFAQs.length})`, icon: HelpCircle },
          { label: `Videos (${mockVideos.length})`, icon: Play },
        ].map((tab, index) => {
          const IconComponent = tab.icon;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.tab, activeTab === index && styles.activeTab]}
              onPress={() => setActiveTab(index)}
            >
              <IconComponent
                size={20}
                {...({ color: activeTab === index ? '#3182CE' : '#718096' } as any)}
              />
              <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedArticle?.title || selectedGuide?.title}
            </Text>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedArticle && (
              <View>
                <View style={styles.articleMeta}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{selectedArticle.category}</Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedArticle.difficulty) }]}>
                    <Text style={styles.difficultyText}>{selectedArticle.difficulty}</Text>
                  </View>
                  <View style={styles.readTimeBadge}>
                    <ClockIcon size={14} color="#718096" />
                    <Text style={styles.readTimeText}>{selectedArticle.estimatedReadTime} min read</Text>
                  </View>
                </View>

                <Text style={styles.articleContent}>
                  {selectedArticle.content}
                </Text>

                {selectedArticle.attachments && selectedArticle.attachments.length > 0 && (
                  <View style={styles.attachmentsContainer}>
                    <Text style={styles.attachmentsTitle}>Attachments:</Text>
                    {selectedArticle.attachments.map((attachment: { type: 'image' | 'video' | 'document'; url: string; filename: string }, index: number) => (
                      <TouchableOpacity key={index} style={styles.attachment}>
                        <Text style={styles.attachmentText}>{attachment.filename}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.articleFooter}>
                  <View style={styles.articleStats}>
                    <Text style={styles.articleStatText}>By {selectedArticle.author}</Text>
                    <Text style={styles.articleStatText}>Updated {selectedArticle.updatedAt}</Text>
                    <Text style={styles.articleStatText}>{selectedArticle.views} views</Text>
                  </View>

                  <View style={styles.articleActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.helpfulButton]}
                      onPress={() => handleHelpful('article', selectedArticle.id, true)}
                    >
                      <ThumbsUpIcon size={16} color="#48BB78" />
                      <Text style={[styles.actionButtonText, { color: '#48BB78', marginLeft: 4 }]}>
                        Helpful ({selectedArticle.helpful})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                      <Text style={styles.secondaryButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {selectedGuide && (
              <View>
                <View style={styles.guideMeta}>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedGuide.difficulty) }]}>
                    <Text style={styles.difficultyText}>{selectedGuide.difficulty}</Text>
                  </View>
                  <View style={styles.timeBadge}>
                    <ClockIcon size={14} color="#718096" />
                    <Text style={styles.timeText}>{selectedGuide.estimatedTime}</Text>
                  </View>
                  <View style={styles.successBadge}>
                    <Text style={styles.successText}>{selectedGuide.successRate}% Success Rate</Text>
                  </View>
                </View>

                <View style={styles.guideSection}>
                  <Text style={styles.sectionTitle}>Problem:</Text>
                  <Text style={styles.sectionContent}>{selectedGuide.problem}</Text>
                </View>

                <View style={styles.guideSection}>
                  <Text style={styles.sectionTitle}>Solution:</Text>
                  <Text style={styles.sectionContent}>{selectedGuide.solution}</Text>
                </View>

                {selectedGuide.prerequisites.length > 0 && (
                  <View style={styles.guideSection}>
                    <Text style={styles.sectionTitle}>Prerequisites:</Text>
                    {selectedGuide.prerequisites.map((prereq: string, index: number) => (
                      <Text key={index} style={styles.listItem}>• {prereq}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.guideSection}>
                  <Text style={styles.sectionTitle}>Required Tools:</Text>
                  <View style={styles.toolsContainer}>
                    {selectedGuide.tools.map((tool: string, index: number) => (
                      <View key={index} style={styles.toolBadge}>
                        <Text style={styles.toolText}>{tool}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.guideSection}>
                  <Text style={styles.sectionTitle}>Step-by-Step Solution:</Text>
                  {selectedGuide.steps.map((step: string, index: number) => (
                    <View key={index} style={styles.stepContainer}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {selectedGuide.warnings.length > 0 && (
                  <View style={[styles.guideSection, styles.warningSection]}>
                    <Text style={[styles.sectionTitle, { color: '#E53E3E' }]}>⚠️ Safety Warnings:</Text>
                    {selectedGuide.warnings.map((warning: string, index: number) => (
                      <Text key={index} style={[styles.listItem, { color: '#E53E3E' }]}>
                        • {warning}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.guideActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => {
                      Alert.alert(
                        'Guide Completed!',
                        `Great job! This should save you about ${selectedGuide.timeSaved} minutes.`,
                        [{ text: 'OK', onPress: () => setModalVisible(false) }]
                      );
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Mark as Completed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Still Need Help</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3748',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 16,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  difficultyFilters: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterChip: {
    backgroundColor: '#3182CE',
    borderColor: '#3182CE',
  },
  filterChipText: {
    fontSize: 14,
    color: '#4A5568',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3182CE',
  },
  tabText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3182CE',
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    lineHeight: 24,
  },
  cardSummary: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#4A5568',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorText: {
    fontSize: 12,
    color: '#718096',
  },
  helpfulStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulText: {
    fontSize: 12,
    color: '#48BB78',
    marginLeft: 4,
    fontWeight: '600',
  },
  problemText: {
    fontSize: 14,
    color: '#2D3748',
    marginBottom: 12,
    lineHeight: 20,
  },
  problemLabel: {
    fontWeight: '600',
  },
  guideStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3182CE',
  },
  secondaryButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#4A5568',
  },
  faqFooter: {
    marginTop: 12,
  },
  faqActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  smallButton: {
    flex: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  videoThumbnail: {
    height: 180,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  videoInfo: {
    padding: 16,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoTags: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3182CE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  watchButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#4A5568',
    fontWeight: 'bold',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  articleMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  readTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  readTimeText: {
    fontSize: 12,
    color: '#4A5568',
    marginLeft: 4,
  },
  articleContent: {
    fontSize: 16,
    color: '#2D3748',
    lineHeight: 24,
    marginBottom: 16,
  },
  attachmentsContainer: {
    marginBottom: 16,
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  attachment: {
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentText: {
    fontSize: 14,
    color: '#3182CE',
  },
  articleFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  articleStats: {
    marginBottom: 16,
  },
  articleStatText: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  articleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helpfulButton: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#9AE6B4',
  },
  guideMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#4A5568',
    marginLeft: 4,
  },
  successBadge: {
    backgroundColor: '#C6F6D5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  successText: {
    fontSize: 12,
    color: '#22543D',
    fontWeight: '600',
  },
  guideSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  listItem: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 4,
  },
  toolsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  toolBadge: {
    backgroundColor: '#FED7D7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  toolText: {
    fontSize: 12,
    color: '#C53030',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3182CE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  warningSection: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  guideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#48BB78',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
