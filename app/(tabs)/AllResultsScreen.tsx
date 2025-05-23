import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ExamResult = {
  id: number;
  correctAnswers: number;
  totalQuestions: number;
  examTime: string;
  timestamp: string;
  urlRef: string;
};

export default function AllResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const resultsPerPage = 10;

  useEffect(() => {
    // Получаем результаты из параметров навигации
    if (params.examResults) {
      // Поскольку параметры приходят в виде строки, нужно преобразовать их обратно в массив
      try {
        const results = JSON.parse(params.examResults as string) as ExamResult[];
        
        // Сортируем по дате - от новых к старым
        const sortedResults = results.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setExamResults(sortedResults);
        setTotalPages(Math.ceil(sortedResults.length / resultsPerPage));
      } catch (error) {
        console.error('Ошибка при получении результатов экзаменов:', error);
      }
    }
  }, [params.examResults]);

  // Получаем результаты для текущей страницы
  const getCurrentPageResults = () => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return examResults.slice(startIndex, endIndex);
  };

  // Переход на следующую страницу
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Переход на предыдущую страницу
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Форматирование даты в московское время
  const formatDate = (dateString: string) => {
    try {
      // Преобразуем в московское время (UTC+3)
      const date = new Date(dateString);
      
      // Создаем дату в UTC
      const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      // Добавляем 3 часа для московского времени (UTC+3)
      const moscowDate = new Date(utcDate.getTime() + 6 * 60 * 60 * 1000);
      
      // Форматируем дату
      const day = moscowDate.getDate().toString().padStart(2, '0');
      const month = (moscowDate.getMonth() + 1).toString().padStart(2, '0');
      const year = moscowDate.getFullYear();
      const hours = moscowDate.getHours().toString().padStart(2, '0');
      const minutes = moscowDate.getMinutes().toString().padStart(2, '0');

      return `${day}.${month}.${year} ${hours}:${minutes} (МСК)`;
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return dateString;
    }
  };

  // Определение типа экзамена по URL
  const getExamTypeFromUrl = (url: string) => {
    if (url.includes('exam/result')) {
      return 'Экзамен ПДД';
    } else if (url.includes('traffic_signs/training/result')) {
      return 'Знаки ПДД';
    } else {
      return 'Экзамен ПДД';
    }
  };

  // Рендеринг элемента результата
  const renderResultItem = ({ item }: { item: ExamResult }) => (
    <View style={styles.resultItem}>
      <Text style={styles.resultType}>{getExamTypeFromUrl(item.urlRef)}</Text>
      <Text style={styles.resultText}>
        Результат: {item.correctAnswers} из {item.totalQuestions} 
        ({Math.round((item.correctAnswers / item.totalQuestions) * 100)}%)
      </Text>
      <Text style={styles.resultTime}>
        {formatDate(item.timestamp)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <IconSymbol size={24} name="arrow.left" color="white" />
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Все результаты экзаменов</Text>
      </View>

      <View style={styles.content}>
        {examResults.length > 0 ? (
          <>
            <FlatList
              data={getCurrentPageResults()}
              renderItem={renderResultItem}
              keyExtractor={(item, index) => `${item.id || ''}-${index}`}
              contentContainerStyle={styles.listContainer}
            />
            
            <View style={styles.pagination}>
              <TouchableOpacity 
                style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
                onPress={prevPage}
                disabled={currentPage === 1}
              >
                <Text style={styles.pageButtonText}>Назад</Text>
              </TouchableOpacity>
              
              <Text style={styles.pageInfo}>
                Страница {currentPage} из {totalPages}
              </Text>
              
              <TouchableOpacity 
                style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
                onPress={nextPage}
                disabled={currentPage === totalPages}
              >
                <Text style={styles.pageButtonText}>Вперёд</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.noResultsText}>Нет результатов экзаменов</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 15,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 30, // Компенсация для выравнивания по центру
  },
  content: {
    flex: 1,
    padding: 15,
  },
  listContainer: {
    paddingBottom: 20,
  },
  resultItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  resultType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 5,
  },
  resultTime: {
    fontSize: 13,
    color: '#666',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 60,
  },
  pageButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  pageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pageInfo: {
    fontSize: 14,
    color: '#333',
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 30,
  },
}); 