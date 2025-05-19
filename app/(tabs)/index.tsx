import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

// Словарь SVG файлов
// Используем статический импорт для всех SVG-файлов, чтобы Metro мог обработать их на этапе сборки
const SVG_FILES: { [key: string]: any } = {
  'Железнодорожный переезд со шлагбаумом': require('../../assets/images/signs/c6a558e6fbb120c93d55d8fd967dbe12.svg'),
  'Железнодорожный переезд без шлагбаума': require('../../assets/images/signs/83f281bb018ce60e820c7f6be9c134dc.svg'),
  'Однопутная железная дорога': require('../../assets/images/signs/8231f34584e8aa44ccbb561cbaa35688.svg'),
  'Многопутная железная дорога': require('../../assets/images/signs/87348b472014495db6c032af23df8d3a.svg'),
  'Приближение к железнодорожному переезду': require('../../assets/images/signs/4a81d6b210c719d3169aaa0dca0c6236.svg'),
  'Пересечение с трамвайной линией': require('../../assets/images/signs/578c3540c391e5986467d497f63d7c09.svg'),
  'Пересечение равнозначных дорог': require('../../assets/images/signs/7cd691a55c5de8504d293ea19a606ab9.svg'),
  'Пересечение с круговым движением': require('../../assets/images/signs/c61293b97e38afa2aad680c3e8d6af08.svg'),
  'Светофорное регулирование': require('../../assets/images/signs/58f102bf9902a200e8cca8144ad2284c.svg'),
  'Разводной мост': require('../../assets/images/signs/b5a6748d791f08ae4af8f92e86f4a3ba.svg'),
  'Выезд на набережную': require('../../assets/images/signs/dded61f2ea9c8709c14a8134258c895a.svg'),
  'Опасный поворот (правый)': require('../../assets/images/signs/7db7847fc21327e2a75716ee03ec23d5.svg'),
  'Опасный поворот (левый)': require('../../assets/images/signs/da41b8446c2150dd42e805bf2416b2f6.svg'),
  'Опасные повороты (с первым поворотом направо)': require('../../assets/images/signs/41c00d307234f7446b98e8e45df02687.svg'),
  'Опасные повороты (с первым поворотом налево)': require('../../assets/images/signs/d0c989fcc0302d8851bfa531de49537b.svg'),
  'Крутой спуск': require('../../assets/images/signs/63db8254d7e4237477dc2867e9c69d9c.svg'),
  'Крутой подъем': require('../../assets/images/signs/275c24b735cf456a411fa6a6bf30b8e9.svg'),
  'Скользкая дорога': require('../../assets/images/signs/66e7d4e5770deff0d3bdd165cdafdefd.svg'),
  'Неровная дорога': require('../../assets/images/signs/343a661fe1667d501e436fbc1f655c96.svg'),
  'Искусственная неровность': require('../../assets/images/signs/f9f9d2a86210a49f47bdeec985d98e80.svg'),
  'Выброс гравия': require('../../assets/images/signs/2017ed2db11d6dce6d4c3a6e5cf1b297.svg'),
  'Опасная обочина': require('../../assets/images/signs/e200c6f0253fb1f71dae7b0cd0800557.svg'),
  'Сужение дороги.': require('../../assets/images/signs/b3ade4e8a06ca1f7f773b215d32a2315.svg'),
  'Сужение дороги': require('../../assets/images/signs/4b729689429a923d1634207bfd4650b3.svg'),
  'Двустороннее движение': require('../../assets/images/signs/f40f71b414882df64daced1a6afad2ba.svg'),
  'Пешеходный переход': require('../../assets/images/signs/982792bfd504ae48ccf1ac4e42a0767e.svg'),
  'Дети': require('../../assets/images/signs/374c5f0dc69341c672ac8d8744d9b951.svg'),
  'Пересечение с велосипедной дорожкой или велопешеходной дорожкой': require('../../assets/images/signs/e0f5a506bfd9f817b50182d6bfaeb66f.svg'),
  'Дорожные работы': require('../../assets/images/signs/24d6164e6c97727edb3cb183e7c68325.svg'),
  'Перегон скота': require('../../assets/images/signs/5de8d56a79f4014a86621419b78ce1cc.svg'),
  'Дикие животные': require('../../assets/images/signs/0b31080392cdcf8efbd1e97068cd169d.svg'),
  'Падение камней': require('../../assets/images/signs/03b0085e9ae96b6c86050ae0f2cb9031.svg'),
  'Боковой ветер': require('../../assets/images/signs/7ea6b707c222dd7cb4e7fbdb7660ec75.svg'),
  'Низколетящие самолеты': require('../../assets/images/signs/0bc0c9ffdc942036e637d03d9fa663bd.svg'),
  'Тоннель': require('../../assets/images/signs/a80f78b51626464d56817f3630ae9f02.svg'),
  'Затор': require('../../assets/images/signs/e0832c9f4c9d131bdd5fb542f6be8a2a.svg'),
  'Прочие опасности': require('../../assets/images/signs/95c20b7894f5ff2995481ad277f6d392.svg'),
  'Направление поворота': require('../../assets/images/signs/2ff8dce0350fa3d7117b50e733b69862.svg'),
  'Участок перекрестка': require('../../assets/images/signs/fbf4a078f330f3988095dd96e5a76041.svg'),
  'Главная дорога': require('../../assets/images/signs/c56c59646b12f56cc259a0c240446ddb.svg'),
  'Конец главной дороги': require('../../assets/images/signs/aeaa9658d323d0cbe76781e44f883aba.svg'),
  'Пересечение со второстепенной дорогой': require('../../assets/images/signs/600a61ad31228e1f8b01ace9238ab436.svg'),
  'Примыкание второстепенной дороги': require('../../assets/images/signs/6e7cae8e6d057533a64b2c3f4a766e85.svg'),
  'Уступите дорогу': require('../../assets/images/signs/cc8922782f1e3262ac4dfbb3fbe8cbe6.svg'),
  'Движение без остановки запрещено': require('../../assets/images/signs/2bc0f81810c66f9af28b7a7ba506aa56.svg'),
  'Преимущество встречного движения': require('../../assets/images/signs/59f11961eb2e50d67ff5840cbc67d810.svg'),
  'Преимущество перед встречным движением': require('../../assets/images/signs/ba51fb25f54b4902f2343928fbfbadc4.svg'),
  'Въезд запрещен': require('../../assets/images/signs/9f77764c15a21428b8e6e7f5c75936e2.svg'),
  'Движение запрещено': require('../../assets/images/signs/34cb3c56f57e675aa834aa440b1cb7b0.svg'),
  'Движение механических транспортных средств запрещено': require('../../assets/images/signs/08c6ccd7e2a83f22760e6b819fc6903e.svg'),
  'Движение грузовых автомобилей запрещено': require('../../assets/images/signs/914fd360991ffa9b61f253758e04e16b.svg'),
  'Движение мотоциклов запрещено': require('../../assets/images/signs/9aaa18f58f694795cddf7e13ddcc4fbf.svg'),
  'Движение тракторов запрещено': require('../../assets/images/signs/54ebf28e98a87237762c1e6cb0f1b7ce.svg'),
  'Движение с прицепом запрещено': require('../../assets/images/signs/75d9cc53558cb11ba3977cd3a3d0ab19.svg'),
  'Движение гужевых повозок запрещено': require('../../assets/images/signs/ef60d8138f893003bed1dba33e17c03e.svg'),
  'Движение на велосипедах запрещено': require('../../assets/images/signs/bb075c4b76fd011bc5fdd18c641d15ac.svg'),
  'Движение пешеходов запрещено': require('../../assets/images/signs/5e10d01ece04b20a6053422accd40715.svg'),
  'Ограничение массы': require('../../assets/images/signs/068747edfecce150c32c884f33993fe5.svg'),
  'Ограничение массы, приходящейся на ось транспортного средства': require('../../assets/images/signs/65257ca9ce6d79c1c0310e738a2c1ab4.svg'),
  'Ограничение высоты': require('../../assets/images/signs/d414912394ad7ce94a1b5231a48461ae.svg'),
  'Ограничение ширины': require('../../assets/images/signs/ddcc2db01c1573b8b9f1d2a69983a4c2.svg'),
  'Ограничение длины': require('../../assets/images/signs/ac2d23173a5924e3412fcd0ef249e811.svg'),
  'Ограничение минимальной дистанции': require('../../assets/images/signs/c1897beee89c46a70537922b8a7e05f4.svg'),
  'Таможня': require('../../assets/images/signs/99fa0ef722f7e87702dcbf311b1d4903.svg'),
  'Опасность': require('../../assets/images/signs/ddb141598843973c26ff792b30258257.svg'),
  'Контроль': require('../../assets/images/signs/25b68a4c922b42620ee23bec91f7bb6b.svg'),
  'Поворот направо запрещен': require('../../assets/images/signs/b519a818d4b84d09db35ba439ef7762d.svg'),
  'Поворот налево запрещен': require('../../assets/images/signs/6b13acd4920340d6a5ade9cbf8b7733d.svg'),
  'Разворот запрещен': require('../../assets/images/signs/a77036dc28d01bd6a43b7e1dc8c7f78d.svg'),
  'Обгон запрещен': require('../../assets/images/signs/10b31089e23256d42615a68260f1960b.svg'),
  'Конец зоны запрещения обгона': require('../../assets/images/signs/6654cc3433e1a3946decf8d350d4e99f.svg'),
  'Обгон грузовым автомобилем запрещен': require('../../assets/images/signs/218ffabddb61261300f3a99b19a0ea77.svg'),
  'Конец зоны запрещения обгона грузовым автомобилям': require('../../assets/images/signs/8972f87ccd509bc265ae5a4bb40c87ff.svg'),
  'Ограничение максимальной скорости': require('../../assets/images/signs/afe2a800e15fdfb647cbbf80ed8ffb1a.svg'),
  'Конец зоны ограничения максимальной скорости': require('../../assets/images/signs/88f2e89569fde85399a3119939e9362d.svg'),
  'Подача звукового сигнала запрещена': require('../../assets/images/signs/d69cde7c75a100a5ad1b051a363e9798.svg'),
  'Остановка запрещена': require('../../assets/images/signs/32f6c6260d4ca82b635350a9ec41689b.svg'),
  'Стоянка запрещена': require('../../assets/images/signs/c64e8fde613df61be12cb0d6b3e8e634.svg'),
  'Стоянка запрещена по нечетным числам месяца': require('../../assets/images/signs/7958b8f457dbafef41933413bd561e78.svg'),
  'Стоянка запрещена по четным числам месяца': require('../../assets/images/signs/a371758db16fc213e35b2d83517b7517.svg'),
  'Конец зоны всех ограничений': require('../../assets/images/signs/9bcec66d4b6d2d724af18234cea86409.svg'),
  'Движение транспортных средств с опасными грузами запрещено': require('../../assets/images/signs/9e26b76d6e5a7c5c18d24c55f1eec2e4.svg'),
  'Движение транспортных средств с взрывчатыми и легковоспламеняющимися грузами запрещено': require('../../assets/images/signs/4c5aa981f6fb1fbfa01712a2724f3883.svg'),
  'Движение автобусов запрещено': require('../../assets/images/signs/4f3323041ff6c39163c6e0f34b531904.svg'),
  'Движение на средствах индивидуальной мобильности запрещено': require('../../assets/images/signs/86d638ddcb608b242da09a549b545bcf.svg'),
  'Движение прямо': require('../../assets/images/signs/edfa72956b6ebefa96d04500db9285e1.svg'),
  'Движение направо': require('../../assets/images/signs/f5e183503d29e5e1959541346d1fe2b6.svg'),
  'Движение налево': require('../../assets/images/signs/20412a2d3a8dba838a80b04ac05e0bba.svg'),
  'Движение прямо или направо': require('../../assets/images/signs/36a7dc2f0402fb1c3b52e998cc4f2639.svg'),
  'Движение прямо или налево': require('../../assets/images/signs/a4f684add2aee502a2a42567d6e5aff2.svg'),
  'Движение направо или налево': require('../../assets/images/signs/bff85c177f0e2166e4d881c52cb57943.svg'),
  'Объезд препятствия справа': require('../../assets/images/signs/2a04d02796007c51b2b1c61f5915a9bb.svg'),
  'Объезд препятствия слева': require('../../assets/images/signs/2ab08b0518c64b8ebedc5d9e4e632d18.svg'),
  'Объезд препятствия справа или слева': require('../../assets/images/signs/55444c380ed0f9052af912b13d1040c2.svg'),
  'Круговое движение': require('../../assets/images/signs/58e7e696835bcc69857b61cf990b6151.svg'),
  'Велосипедная дорожка': require('../../assets/images/signs/729fb6b3c0f5c83fa4fd2e41e061aeda.svg'),
  'Конец велосипедной дорожки': require('../../assets/images/signs/155ee2d1eb349cb22fd28ec943375dc2.svg'),
  'Пешеходная дорожка': require('../../assets/images/signs/7ed2392cb565f59a0677e169a75abb5a.svg'),
  'Пешеходная и велосипедная дорожка с совмещенным движением (велопешеходная дорожка с совмещенным движением)': require('../../assets/images/signs/6d32e475df4cc14e6de380997aaeb51d.svg'),
  'Конец пешеходной и велосипедной дорожки с совмещенным движением (конец велопешеходной дорожки с совмещенным движением)': require('../../assets/images/signs/ebabed716c12bca2ae3f1bec74bb74e0.svg'),
  'Пешеходная и велосипедная дорожка с разделением движения': require('../../assets/images/signs/f63df427a9d45b0c938dcec9bb92effb.svg'),
  'Конец пешеходной и велосипедной дорожки с разделением движения (конец велопешеходной дорожки с разделением движения)': require('../../assets/images/signs/2d4e5fbe86643950a8df6714211874ac.svg'),
  'Ограничение минимальной скорости': require('../../assets/images/signs/8d75c6c47899372ca2fe29d2aaaf7ef0.svg'),
  'Конец зоны ограничения минимальной скорости': require('../../assets/images/signs/73ba23061c79c6fedde6f6815b898e0c.svg'),
  'Направление движения транспортных средств с опасными грузами': require('../../assets/images/signs/a3c739d9396fba61a07febb646118b39.svg'),
  'Автомагистраль': require('../../assets/images/signs/30ef8488ecc5abc3fe2758fb400a6ad6.svg'),
  'Конец автомагистрали': require('../../assets/images/signs/186fc9221cc561b1d35260f2178e8b7d.svg'),
  'Дорога для автомобилей': require('../../assets/images/signs/a482c86004b27c60a7f7fd8aa4eabea5.svg'),
  'Конец дороги для автомобилей': require('../../assets/images/signs/81b2326a382ee8076f85797956a47c6a.svg'),
  'Дорога с односторонним движением': require('../../assets/images/signs/1346f884b8d8b48ffd07df32058779b2.svg'),
  'Конец дороги с односторонним движением': require('../../assets/images/signs/b5666c37f7cc53c2e6c5b9f9d1139156.svg'),
  'Выезд на дорогу с односторонним движением.': require('../../assets/images/signs/eaa67e0f15d830945fbd285b1a198768.svg'),
  'Реверсивное движение': require('../../assets/images/signs/3ffcf683b099f1108e43767eb611dee9.svg'),
  'Конец реверсивного движения': require('../../assets/images/signs/31d460be855f04c2263c8690e62b715d.svg'),
  'Выезд на дорогу с реверсивным движением': require('../../assets/images/signs/f2e247bb2668f187b147f897639b482e.svg'),
  'Дорога с полосой для маршрутных транспортных средств': require('../../assets/images/signs/5e74ef793315c48a24193f8d1bd34409.svg'),
  'Дорога с полосой для велосипедистов': require('../../assets/images/signs/3417cb06252d5348b568b87a0547e3b6.svg'),
  'Конец дороги с полосой для маршрутных транспортных средств': require('../../assets/images/signs/49010e49177332307b04aac8146c94d7.svg'),
  'Конец дороги с полосой для велосипедистов': require('../../assets/images/signs/e03e05911c4bfcee90cd96a42dc4caa2.svg'),
  'Выезд на дорогу с полосой для маршрутных транспортных средств': require('../../assets/images/signs/6f250c306d6911bf975744127dcfa861.svg'),
  'Выезд на дорогу с полосой для велосипедистов': require('../../assets/images/signs/040dd5b89c58d745f260470b69f95c65.svg'),
  'Конец полосы для велосипедистов': require('../../assets/images/signs/8af3051b4e6b17af2f625c0b55db66fb.svg'),
  'Направления движения по полосам': require('../../assets/images/signs/0681ef67b1ece368503d8ea99032ae81.svg'),
  'Начало полосы': require('../../assets/images/signs/b8f365d78f5e528c3bfd33af36910053.svg'),
  'Конец полосы': require('../../assets/images/signs/a366fbccc0d7e20f9d8ddf7c07f96a94.svg'),
  'Направление движения по полосам': require('../../assets/images/signs/21cfe9835811be4037063248f7f71722.svg'),
  'Число полос': require('../../assets/images/signs/2fba92f5f3bfd14956d7bc4e6b463cc3.svg'),
  'Место остановки автобуса и (или) троллейбуса': require('../../assets/images/signs/d04e25e655acda59116d783bdd771c4a.svg'),
  'Место остановки трамвая': require('../../assets/images/signs/aca41c63f4d3ed3106c239531f68b8cb.svg'),
  'Место стоянки легковых такси': require('../../assets/images/signs/e6b05e014f5c98ca11e53c44113ba47a.svg'),
  'Жилая зона': require('../../assets/images/signs/b81a8535c1c8399750342e997c877a83.svg'),
  'Конец жилой зоны': require('../../assets/images/signs/05ff92d6ded01a43a03530c05540f5c2.svg'),
  'Начало населенного пункта': require('../../assets/images/signs/d70f1a70a8a13c3ddc2aff857af62cc3.svg'),
  'Конец населенного пункта': require('../../assets/images/signs/96dca5136d8e68a65997314f1cfc8057.svg'),
  'Зона с ограничением стоянки': require('../../assets/images/signs/14c4e6f9bf615642cd376816b1c9a31b.svg'),
  'Конец зоны с ограничением стоянки': require('../../assets/images/signs/aa0da72b4ed18058857247a419b321d4.svg'),
  'Зона регулируемой стоянки': require('../../assets/images/signs/610af5057a545235a28e294c215ecccf.svg'),
  'Конец зоны регулируемой стоянки': require('../../assets/images/signs/8509aedb94c4ba5b421c708293fdb7ce.svg'),
  'Зона с ограничением максимальной скорости': require('../../assets/images/signs/bc1b8dc9f72988f492f1f6cb011431bb.svg'),
  'Конец зоны с ограничением максимальной скорости': require('../../assets/images/signs/e44d95bcd4b97b097c8473e98f189e77.svg'),
  'Пешеходная зона': require('../../assets/images/signs/d52366ac63d7e334fd5be1b120360481.svg'),
  'Конец пешеходной зоны': require('../../assets/images/signs/e88445389c8086879623298c42b7fe19.svg'),
  'Зона с ограничением экологического класса механических транспортных средств': require('../../assets/images/signs/242f0f9e4e3b62378736cf94bfa497c3.svg'),
  'Конец зоны с ограничением экологического класса механических транспортных средств': require('../../assets/images/signs/345a99a1a4b932347124cabca8d24ebf.svg'),
  'Зона с ограничением экологического класса по видам транспортных средств': require('../../assets/images/signs/1803985703e79e068adae5fbe8b509b6.svg'),
  'Конец зоны с ограничением экологического класса по видам транспортных средств': require('../../assets/images/signs/6d0f14589f6af543715764288d124d1e.svg'),
  'Велосипедная зона': require('../../assets/images/signs/d3160697c5cd4c697e7b68e4cbad44e3.svg'),
  'Конец велосипедной зоны': require('../../assets/images/signs/eeab078b65f048a6679d8c387c9706b8.svg'),
  'Общие ограничения максимальной скорости': require('../../assets/images/signs/545aeb9ed09a63b6ba8c1d582309c18f.svg'),
  'Рекомендуемая скорость': require('../../assets/images/signs/58b42c05d3e791c8263461b0e0379916.svg'),
  'Место для разворота': require('../../assets/images/signs/c5a140e4e6c30d973224af2a38a608bc.svg'),
  'Зона для разворота': require('../../assets/images/signs/a8ae91018e84ca4d6838885ffb142419.svg'),
  'Парковка (парковочное место)': require('../../assets/images/signs/9c264561036f4345cb397727afe03cb4.svg'),
  'Полоса аварийной остановки': require('../../assets/images/signs/6bf62a1a2494304fb5e03eb8d440ed70.svg'),
  'Подземный пешеходный переход': require('../../assets/images/signs/093777c883e6312ca8ca3cd7cf5e4516.svg'),
  'Надземный пешеходный переход': require('../../assets/images/signs/790e884d35ea1f9dc3ae8946276c0506.svg'),
  'Тупик': require('../../assets/images/signs/6698506a4dfde9bdd505a9416cf99ad1.svg'),
  'Предварительный указатель направлений': require('../../assets/images/signs/78675c94103f63e2c9e95721177f85b7.svg'),
  'Предварительный указатель направления': require('../../assets/images/signs/581726513bf08809b4bb12dc9de91198.svg'),
  'Схема движения': require('../../assets/images/signs/1679d3602327fc9e02252cbd987827d2.svg'),
  'Указатель направлений': require('../../assets/images/signs/ed1863f394cab85e875897a4a7301b7b.svg'),
  'Наименование объекта': require('../../assets/images/signs/d9499edc5f28b0dad5d1cf96a948c008.svg'),
  'Указатель расстояний': require('../../assets/images/signs/b665ed30bb7c753703354357f288ef6a.svg'),
  'Километровый знак': require('../../assets/images/signs/76ba0dea92f4426642503b1de1ccb9b3.svg'),
  'Номер маршрута': require('../../assets/images/signs/43ee93f9beef73510d34a41e5f2e67d8.svg'),
  'Направление движения для грузовых автомобилей': require('../../assets/images/signs/97fec8946f925b9144aced6c6c045173.svg'),
  'Стоп-линия': require('../../assets/images/signs/3343f65fb065ffe6481350c2829522c2.svg'),
  'Схема объезда': require('../../assets/images/signs/f471a5ecb73a5a95f6d5820518ff4da0.svg'),
  'Направление объезда': require('../../assets/images/signs/36dec91dd31b821fd5cf0feab858d1c6.svg'),
  'Предварительный указатель перестроения на другую проезжую часть': require('../../assets/images/signs/8795fafca3aed200ee782fa766df1416.svg'),
  'Аварийный выход': require('../../assets/images/signs/7d41716ad000606623f15a20c5ab9e0d.svg'),
  'Направление движения к аварийному выходу': require('../../assets/images/signs/e957b683cdca0245291f7322a8388e14.svg'),
  'Фотовидеофиксация': require('../../assets/images/signs/8228a3dcddaa013dc8fd8e816cc22cc9.svg'),
  'Пункт медицинской помощи': require('../../assets/images/signs/aeefa11a7668b0f779cbbf50c0dbf748.svg'),
  'Больница': require('../../assets/images/signs/8bc512242cc8d3e084ad1f59eda9a863.svg'),
  'Автозаправочная станция': require('../../assets/images/signs/f33fe3ea91d17dd2e1471bb7403430c9.svg'),
  'Техническое обслуживание автомобилей': require('../../assets/images/signs/b1b835da7a2ff04a831c0d5321e853da.svg'),
  'Мойка автомобилей': require('../../assets/images/signs/9fdf2e19bc009ba511d778fadbd5aeb7.svg'),
  'Телефон': require('../../assets/images/signs/2eac94f432d3ee50afdeac2fb4c463b5.svg'),
  'Пункт питания': require('../../assets/images/signs/cdf562fd51c6bd678899ab95a68250a5.svg'),
  'Питьевая вода': require('../../assets/images/signs/d0adc92b61f004c713c26d08e9114eb8.svg'),
  'Гостиница или мотель': require('../../assets/images/signs/50f03ffa7c33a8dcb7df429e0837cfbb.svg'),
  'Кемпинг': require('../../assets/images/signs/f1373aa9762a336d2752c7ed8cbf9850.svg'),
  'Место отдыха': require('../../assets/images/signs/f05ee79d3126e8f4ec8307e9bfe0baf2.svg'),
  'Пост дорожно-патрульной службы': require('../../assets/images/signs/f6fe79ec307f75faa8347a470586532b.svg'),
  'Полиция': require('../../assets/images/signs/0c3947bf4d54a57c386e151b17fd02b2.svg'),
  'Пункт транспортного контроля': require('../../assets/images/signs/3476127cc3910b6859d3cc1ae0d1807d.svg'),
  'Зона приема радиостанции, передающей информацию о дорожном движении': require('../../assets/images/signs/fe7c5ee643acc09f3b2d53bd13b05587.svg'),
  'Зона радиосвязи с аварийными службами': require('../../assets/images/signs/4e9d823ddb98beb52f3ea6fc05270b69.svg'),
  'Бассейн или пляж': require('../../assets/images/signs/bd4b37d28532d055639fb030d3956ab1.svg'),
  'Туалет': require('../../assets/images/signs/78a6ed148fc072db020201c9f125ca0a.svg'),
  'Телефон экстренной связи': require('../../assets/images/signs/cf703c67799e91157aab4f7c883de05d.svg'),
  'Огнетушитель': require('../../assets/images/signs/aa6600355aebedbb91683be842e94417.svg'),
  'Автозаправочная станция с возможностью зарядки электромобилей': require('../../assets/images/signs/c12f75d4384149c8aec3a074d67cda52.svg'),
  'Расстояние до объекта': require('../../assets/images/signs/3badd393679a1ea39b13d2fa69c93e83.svg'),
  'Зона действия': require('../../assets/images/signs/7e13e8cc1965fba71029290ef8ec3162.svg'),
  'Направление действия': require('../../assets/images/signs/4e4d0a4d9887563082fb91884fccc52f.svg'),
  'Вид транспортного средства': require('../../assets/images/signs/bfded6a56e241d9d1309c110f51eb6c0.svg'),
  'Кроме вида транспортных средства': require('../../assets/images/signs/db658fa5edbdeb63250095a45d4fe3ba.svg'),
  'Субботние, воскресные и праздничные дни': require('../../assets/images/signs/bacd2567523d771bff74605cf1a787f1.svg'),
  'Рабочие дни': require('../../assets/images/signs/5187124058465f93a2202a31c1f08dd4.svg'),
  'Дни недели': require('../../assets/images/signs/ef9aee3770fe7b8d9da6d069e681c833.svg'),
  'Время действия': require('../../assets/images/signs/64111687123fee7f3328f3842ed6961b.svg'),
  'Способ постановки транспортного средства на стоянку': require('../../assets/images/signs/58675851a0bdf1bfc6bb2ffec19b2f08.svg'),
  'Способ посстановки транспортного средства на стоянку': require('../../assets/images/signs/a5c2c6750c60332d0ef500f7455f9dd3.svg'),
  'Стоянка с неработающим двигателем': require('../../assets/images/signs/815fccaec30b9c56f4a688f19ee1e947.svg'),
  'Платные услуги': require('../../assets/images/signs/ba9d09c26ae6d0773e2c70e0b84237c4.svg'),
  'Стоянка только транспортных средств дипломатического корпуса': require('../../assets/images/signs/ed2b51311057d631c048eb2b81f41f63.svg'),
  'Место для осмотра автомобилей': require('../../assets/images/signs/312a66fea6f362d115ed30e84f26175e.svg'),
  'Ограничение разрешенной максимальной массы': require('../../assets/images/signs/9620cfb6c38d4a85351d530cfbff9523.svg'),
  'Направление главной дороги': require('../../assets/images/signs/a213fe50d5e1de0a7eb6427f4c3d5271.svg'),
  'Полоса движения': require('../../assets/images/signs/204b060885d2db4445c191d09c03ae74.svg'),
  'Слепые пешеходы': require('../../assets/images/signs/2501bfddc7cc07324fdc0f80991ae3cc.svg'),
  'Влажное покрытие': require('../../assets/images/signs/d87c82fab2e99c528afa159e23cdbbfb.svg'),
  'Инвалиды': require('../../assets/images/signs/1a1c1daafc7bb06a248c3c57930a2e7b.svg'),
  'Кроме инвалидов': require('../../assets/images/signs/5bcede874a58b37421d515308b58a331.svg'),
  'Класс опасного груза': require('../../assets/images/signs/eefb0a904ed7ed3aecbea3fc5c79a5fa.svg'),
  'Тип тележки транспортного средства': require('../../assets/images/signs/dc4b2b2243c4b3ed51eb412e81774e2c.svg'),
  'Вид маршрутного транспортного средства': require('../../assets/images/signs/5b8b0fd6591bf894df145092cd242708.svg'),
  'Препятствие': require('../../assets/images/signs/f4ce65cda3ff52f3ef02e3fca21567a2.svg'),
  'Работает эвакуатор': require('../../assets/images/signs/7a047c7c3a5ced96d0b5525a81704be3.svg'),
  'Экологический класс транспортного средства': require('../../assets/images/signs/8894b97aa74fe383868dcee176bfb584.svg'),
  'Зарядка электромобилей': require('../../assets/images/signs/869f5d177692243ed6703d663eb88f25.svg'),
};

// Резервный SVG для неизвестных знаков
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M5,50 L50,5 L95,50 L50,95 Z" fill="red" stroke="black" stroke-width="3"/>
  <text x="50" y="65" font-family="Arial" font-size="50" text-anchor="middle" font-weight="bold" fill="white">!</text>
</svg>`;

// Функция для безопасной загрузки SVG файла
const getSvgComponent = (filename: string) => {
  return SVG_FILES[filename] || null;
};

// Функция для поиска SVG файла по номеру знака
const getSvgBySignNumber = (signNumber: string) => {
  const key = Object.keys(SVG_FILES).find(k => k.includes(signNumber));
  return key ? SVG_FILES[key] : null;
};

interface DetectionBox {
  class: string;
  confidence: number;
  coords: number[];
  iddrom: number;
}

interface Frame {
  objects: DetectionBox[];
  num_frame: number;
}

interface VideoDetection {
  frames: Frame[];
  total_frames: number;
}

interface SignData {
  title: string;
  svgComponent?: any;
  description: string;
  svgXml?: string;  
  iddrom?: number;
}

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [results, setResults] = useState<DetectionBox[]>([]);
  const [lastTimestamp, setLastTimestamp] = useState<string>('');
  const cameraRef = useRef<CameraView | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTakingPicture, setIsTakingPicture] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const appState = useRef(AppState.currentState);
  const IP = Constants.expoConfig?.extra?.IP || 'localhost';
  const PORT = Constants.expoConfig?.extra?.PORT || 80;
  const devmode = Constants.expoConfig?.extra?.devmode || false;
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [serverResponse, setServerResponse] = useState<Frame | null>(null);
  const navigation = useNavigation<NavigationProp>();
  
  const colorScheme = useColorScheme();

  type NavigationProp = {
    navigate: (screen: string, params?: { url: string }) => void;
  };

  // Состояние для хранения данных о текущем знаке
  const [currentSignData, setCurrentSignData] = useState<SignData>({
    title: 'Неизвестный знак',
    description: 'Описание отсутствует',
    svgXml: DEFAULT_SVG,
    iddrom: 0
  });

  const getDataBySign = (signClass: string): SignData => {
    console.log('Поиск знака:', signClass);
    
    // Извлекаем номер знака, если есть в формате "1.2", "1.2.1" и т.д.
    const signNumberMatch = signClass.match(/\d+\.\d+(\.\d+)?/);
    const signNumber = signNumberMatch ? signNumberMatch[0] : null;
    
    // Если есть номер знака, пробуем найти SVG по номеру
    if (signNumber) {
      const svgByNumber = getSvgBySignNumber(signNumber);
      if (svgByNumber) {
        console.log('Найден SVG по номеру знака:', signNumber);
        return {
          title: signClass,
          svgComponent: svgByNumber,
          description: `Не загружен`,
        };
      }
    }
    
    // Проверяем наличие знака в нашем словаре SVG
    for (const key in SVG_FILES) {
      if (signClass.includes(key)) {
        console.log('Найден знак по ключевому слову:', key);
      }
    }
    
    let signsData;
    try {
      signsData = require('../../assets/signs.json');
      console.log('signsData loaded:', typeof signsData, Object.keys(signsData).length);
      
      if (!Array.isArray(signsData) && typeof signsData === 'object' && signsData !== null) {
        // Поиск в категориях по номеру знака
        if (signNumber) {
          for (const category in signsData) {
            if (typeof signsData[category] === 'object') {
              for (const signKey in signsData[category]) {
                const sign = signsData[category][signKey];
                if (sign.number === signNumber) {
                  console.log('Найден знак по номеру:', signNumber, 'в категории:', category);
                  
                  // Ищем соответствующий SVG файл по имени файла в sign.image
                  if (sign.image) {
                    const filename = sign.image.split('/').pop();
                    if (filename) {
                      const svgComponent = SVG_FILES[filename];
                      if (svgComponent) {
                        return {
                          title: sign.title || sign.number || signClass,
                          svgComponent: svgComponent,
                          description: sign.description || 'Описание отсутствует',
                          iddrom: sign.iddrom
                        };
                      }
                    }
                  }
                  
                  // Если не получилось загрузить напрямую, ищем по ключевым словам
                  for (const key in SVG_FILES) {
                    if (sign.title?.includes(key) || signClass.includes(key)) {
                      return {
                        title: sign.title || sign.number || signClass,
                        svgComponent: SVG_FILES[key],
                        description: sign.description || 'Описание отсутствует',
                        iddrom: sign.iddrom
                      };
                    }
                  }
                  
                  return {
                    title: sign.title || sign.number || signClass,
                    svgXml: DEFAULT_SVG,
                    description: sign.description || 'Описание отсутствует',
                    iddrom: sign.iddrom
                  };
                }
              }
            }
          }
        }
        
        // Поиск по тексту
        for (const category in signsData) {
          if (typeof signsData[category] === 'object') {
            for (const signKey in signsData[category]) {
              const sign = signsData[category][signKey];
              if (sign.title === signClass || sign.number === signClass || signKey === signClass) {
                console.log('Found sign in category:', category, signKey);
                
                // Проверяем ключевые слова для подбора SVG
                for (const key in SVG_FILES) {
                  if (sign.title?.includes(key) || signClass.includes(key)) {
                    return {
                      title: sign.title || sign.number || signClass,
                      svgComponent: SVG_FILES[key],
                      description: sign.description || 'Описание отсутствует',
                      iddrom: sign.iddrom
                    };
                  }
                }
                
                return {
                  title: sign.title || sign.number || signClass,
                  svgXml: DEFAULT_SVG,
                  description: sign.description || 'Описание отсутствует',
                  iddrom: sign.iddrom
                };
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading signs.json:', error);
      return {
        title: signClass || 'Неизвестный знак',
        svgXml: DEFAULT_SVG,
        description: 'Описание отсутствует',
        iddrom: 0
      };
    }
    
    console.log('Знак не найден, использую запасной:', signClass);
    return {
      title: signClass || 'Неизвестный знак',
      svgXml: DEFAULT_SVG,
      description: 'Описание отсутствует',
      iddrom: 0
    };
  };

  // Функция-хелпер для получения самого вероятного знака из объектов
  const getMostConfidentSign = useCallback(() => {
    if (!serverResponse || !serverResponse.objects || serverResponse.objects.length === 0) {
      return null;
    }
    return serverResponse.objects.sort((a, b) => b.confidence - a.confidence)[0];
  }, [serverResponse]);

  // Загрузка данных о знаке при изменении serverResponse
  useEffect(() => {
    const mostConfidentSign = getMostConfidentSign();
    if (mostConfidentSign) {
      console.log('Наиболее вероятный знак:', mostConfidentSign.class, 'с уверенностью:', mostConfidentSign.confidence);
      const data = getDataBySign(mostConfidentSign.class);
      console.log(data);
      console.log('Загружены данные о знаке:', data.title, 'SVG компонент:', !!data.svgComponent, 'SVG XML:', !!data.svgXml);
      setCurrentSignData(data);
    }
  }, [serverResponse, getMostConfidentSign]);

  const handleCameraReady = useCallback(() => {
    console.log('Camera is ready');
    setTimeout(() => {
      setIsCameraReady(true);
    }, 1000);
  }, []);

  const handleCameraError = useCallback((error: any) => {
    console.error('Camera mount error:', error);
    setIsCameraReady(false);
  }, []);

  const captureAndProcess = useCallback(async () => {
    try {
      setIsTakingPicture(true);
      console.log('Taking picture...');
      if (!cameraRef.current) return;
      const result = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 1,
      });
      console.log('Picture taken', result.uri);
      setLoading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: result.uri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);
      console.log('Отправка запроса на сервер:', `http://${IP}:${PORT}/detect_frame`);
      const response = await fetch(`http://${IP}:${PORT}/detect_frame`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Ответ сервера:', JSON.stringify(data, null, 2));
      setServerResponse(data);
      setIsConnected(true);
      if (data.timestamp) {
        setLastTimestamp(data.timestamp);
      }
      // Открываем модальное окно только после получения ответа
      setModalVisible(true);
      if (data.objects && data.objects.length > 0) {
        setResults(data.objects || []);
        console.log('Распознанные объекты:', data.objects.map((obj: DetectionBox) => ({
          class: obj.class,
          confidence: Math.round(obj.confidence * 100),
          coordinates: obj.coords
        })));
      } else {
        console.log('Объекты не обнаружены');
        setResults([]);
      }
    } catch (error: any) {
      console.error('Ошибка при съемке фото или обработке на сервере:', error);
      setServerResponse(null);
      setIsConnected(false);
    } finally {
      setIsTakingPicture(false);
      setLoading(false);
    }
  }, [IP, PORT]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setIsCameraReady(true);
      } else if (nextAppState.match(/inactive|background/)) {
        setIsCameraReady(false);
        setIsTakingPicture(false);
        setLoading(false);
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Убираем автоматический захват фото
    return () => {};
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Требуется доступ к камере</Text>
        {Platform.OS === 'web' && (
          <Text style={styles.warningText}>
            Внимание: В браузере доступ к камере может быть ограничен. Убедитесь, что вы используете HTTPS и подтвердили доступ в системном диалоге.
          </Text>
        )}
        <Text onPress={async () => {
          const result = await requestPermission();
          if (Platform.OS === 'web' && result.granted) {
            console.log('Web permission granted');
          }
        }} style={styles.permissionButton}>
          Разрешить доступ
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permission ? (
        <>
          <CameraView
            style={styles.camera}
            facing="back"
            ref={cameraRef}
            onCameraReady={handleCameraReady}
            onMountError={handleCameraError}
            active={true}
            mute={true}
          />
          <View style={styles.overlay}>
            <View style={styles.bottomOverlay}>
              <TouchableOpacity
                style={[styles.captureButton, { backgroundColor: isTakingPicture ? Colors[colorScheme ?? 'light'].text : Colors[colorScheme ?? 'light'].tint }] }
                onPress={captureAndProcess}
                disabled={isTakingPicture || !isCameraReady}
              >
                <IconSymbol
                  name="camera.fill"
                  size={40}
                  color={Colors[colorScheme ?? 'light'].background}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                {loading ? <ActivityIndicator size="small" color="black" /> :
                <Text style={styles.modalText}>Фото успешно обработано!</Text>}
                {serverResponse && serverResponse.objects && serverResponse.objects.length > 0 && 
                  <View style={{ alignItems: 'center', maxHeight: 400, width: '90%' }}>
                    {/* <Text style={styles.modalText}>{currentSignData.title}</Text> */}
                    <View style={styles.svgContainer}>
                      {renderSvg(currentSignData)}
                    </View>
                    <Text style={styles.serverResponse}>
                      {serverResponse.objects
                        .sort((a, b) => b.confidence - a.confidence)[0].class} 
                      ({Math.round(serverResponse.objects.sort((a, b) => b.confidence - a.confidence)[0].confidence * 100)}%)
                    </Text>
                    {currentSignData.iddrom !== undefined && currentSignData.iddrom !== 0 && (
                      <TouchableOpacity
                        style={[styles.button, styles.buttonLink]}
                        onPress={() => {
                          const url = `https://www.drom.ru/pdd/pdd/signs/#${currentSignData.iddrom}`;
                          console.log('Переход на страницу:', url);
                          // Здесь можно добавить логику для открытия URL в браузере, например, с использованием Linking из react-native
                          navigation.navigate('WebViewScreen', { url: url });
                          setModalVisible(!modalVisible)
                        }}
                      >
                        <Text style={styles.textStyle}>Подробнее о знаке</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* <Text style={styles.descriptionText}>{currentSignData.description}</Text> */}
                  </View>
                }
                {serverResponse && (!serverResponse.objects || serverResponse.objects.length === 0) &&
                  <Text style={styles.serverResponse}>Объекты не обнаружены</Text>
                }
                <TouchableOpacity
                  style={[styles.button, styles.buttonClose]}
                  onPress={() => setModalVisible(!modalVisible)}
                >
                  <Text style={styles.textStyle}>Закрыть</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.container}>
          <Text style={styles.text}>Требуется доступ к камере</Text>
          {Platform.OS === 'web' && (
            <Text style={styles.warningText}>
              Внимание: В браузере доступ к камере может быть ограничен. Убедитесь, что вы используете HTTPS и подтвердили доступ в системном диалоге.
            </Text>
          )}
          <Text onPress={async () => {
            const result = await requestPermission();
            if (Platform.OS === 'web' && result.granted) {
              console.log('Web permission granted');
            }
          }} style={styles.permissionButton}>
            Разрешить доступ
          </Text>
        </View>
      )}
      
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: isConnected ? 'green' : 'red' }]}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </Text>
        {loading && <ActivityIndicator size="small" color="white" />}
      </View>
      
      {devmode && (
        <View style={styles.resultsContainer}>
          {lastTimestamp ? (
            <Text style={styles.timestampText}>
              Последнее обновление: {lastTimestamp}
            </Text>
          ) : null}
          {results.slice(-5).map((item, index) => (
            <Text key={index} style={styles.resultText}>
              {item.class} ({Math.round(item.confidence * 100)}%)
              {/* {'\n'}Координаты: [{item.coords.join(', ')}] */}
            </Text>
          ))}
          {results.length === 0 && (
            <Text style={styles.resultText}>Объекты не обнаружены</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultsContainer: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    textAlign: 'center',
  },
  resultItem: {
    marginVertical: 2,
    color: 'white',
    textAlign: 'center',
  },
  resultText: {
    fontSize: 16,
    marginVertical: 2,
    color: 'white',
    textAlign: 'center',
  },
  timestampText: {
    fontSize: 14,
    marginBottom: 8,
    color: 'yellow',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  warningText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  permissionButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    color: 'white',
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  captureButton: {
    padding: 10,
    borderRadius: 50,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
    color: 'black',
  },
  photo: {
    width: 200,
    height: 200,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
  },
  svgContainer: {
    width: 200, 
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverResponse: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 5,
    maxHeight: 100,
    overflow: 'scroll',
  },
  descriptionText: {
    marginTop: 10,
    padding: 10,
    textAlign: 'center',
    maxHeight: 100,
    overflow: 'scroll',
  },
  buttonLink: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
  },
});




const renderSvg = (signData: SignData) => {
  if (signData.svgComponent) {
    // Проверяем, есть ли в объекте default компонент
    if (signData.svgComponent.default) {
      const SvgComponent = signData.svgComponent.default;
      return <SvgComponent />;
    }
    // Если это не компонент, используем SvgXml с заглушкой
    return <SvgXml xml={signData.svgXml || DEFAULT_SVG} />;
  }
  return <SvgXml xml={signData.svgXml || DEFAULT_SVG} />;
};