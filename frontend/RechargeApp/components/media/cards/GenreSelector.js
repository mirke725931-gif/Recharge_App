import React, {useState} from 'react';
import {View, StyleSheet, LayoutAnimation, Text} from 'react-native';
import SelectableButton from '../../common/SelectableButton';

export default function GenreSelector({
  genres = [],
  onSelect,
  defaultShow = 3,
}) {
  const [selectedId, setSelectedId] = useState(genres[0]?.id ?? null);
  const [expanded, setExpanded] = useState(false);

  const baseGenres = genres.slice(0, defaultShow);
  const remainGenres = genres.slice(defaultShow);

  const handlePress = genre => {
    setSelectedId(genre.id);
    onSelect?.(genre);
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  return (
    <View style={styles.container}>
      {/* 기본 장르 목록 */}
      <View style={styles.row}>
        {baseGenres.map(g => (
          <SelectableButton
            key={g.id}
            label={<Text style={styles.genreLabel}>{g.name}</Text>}
            selected={selectedId === g.id}
            onPress={() => handlePress(g)}
            style={styles.item}
          />
        ))}

        {/* 더보기 버튼 */}
        {remainGenres.length > 0 && (
          <SelectableButton
            label={
              <Text style={styles.genreLabel}>
                {expanded ? '접기 ▲' : '더보기 +'}
              </Text>
            }
            selected={false}
            onPress={toggleExpand}
            style={styles.item}
          />
        )}
      </View>

      {/* 펼침 영역 */}
      {expanded && (
        <View style={styles.row}>
          {remainGenres.map(g => (
            <SelectableButton
              key={g.id}
              label={<Text style={styles.genreLabel}>{g.name}</Text>}
              selected={selectedId === g.id}
              onPress={() => handlePress(g)}
              style={styles.item}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginTop: 15,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    marginRight: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  genreLabel: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '600',
  },
});
