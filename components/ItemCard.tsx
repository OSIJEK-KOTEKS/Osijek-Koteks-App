import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Item, User } from '../types';
import LocationDetailView from './LocationDetailView';
import { getImageUrl } from '../utils/api';

interface ItemCardProps {
  item: Item;
  userProfile: User | null;
  userToken: string | null;
  onPress: () => void;
  onPhotoPress: (photoUrl: string, type: 'front' | 'back') => void;
  onApprove: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}

export const ItemCard = React.memo(
  ({ item, userProfile, userToken, onPress, onPhotoPress, onApprove, onDelete }: ItemCardProps) => {
    const renderRightActions = () => {
      if (item.approvalStatus === 'odobreno' && item.approvalLocation) {
        return (
          <View style={styles.rightActionContainer}>
            <LocationDetailView location={item.approvalLocation} approvalDate={item.approvalDate} />
          </View>
        );
      }
      return null;
    };

    const handleApprovePress = () => {
      onApprove(item._id);
    };

    const handleDeletePress = () => {
      onDelete(item._id);
    };

    const handlePhotoPress = (type: 'front' | 'back') => {
      const photo = type === 'front' ? item.approvalPhotoFront : item.approvalPhotoBack;
      if (photo?.url) {
        onPhotoPress(photo.url, type);
      }
    };

    const renderPhotoPreview = (type: 'front' | 'back') => {
      const photo = type === 'front' ? item.approvalPhotoFront : item.approvalPhotoBack;
      const label = type === 'front' ? 'Registracija' : 'Materijal';

      if (photo?.url && userToken) {
        return (
          <TouchableOpacity
            style={styles.photoPreviewContainer}
            onPress={() => handlePhotoPress(type)}>
            <View style={styles.previewImageWrapper}>
              <Image
                source={{
                  uri: getImageUrl(photo.url),
                  headers: {
                    Authorization: `Bearer ${userToken}`,
                  },
                  cache: 'reload',
                }}
                style={styles.photoPreview}
                resizeMode="cover"
                resizeMethod="resize"
                progressiveRenderingEnabled={true}
              />
            </View>
            <Text style={styles.viewPhotoText}>{label}</Text>
          </TouchableOpacity>
        );
      }
      return null;
    };

    return (
      <Swipeable renderRightActions={renderRightActions} overshootRight={false} rightThreshold={40}>
        <TouchableOpacity onPress={onPress}>
          <View style={styles.itemContainer}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>

              <View style={styles.detailsContainer}>
                {/* Registracija field first */}
                {item.registracija && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registracija:</Text>
                    <Text style={styles.detailValue}>{item.registracija || '-'}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>RN:</Text>
                  <Text style={styles.detailValue}>{item.code}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Kreiran:</Text>
                  <Text style={styles.detailValue}>
                    {item.creationTime
                      ? `${item.creationDate} ${item.creationTime}`
                      : item.creationDate}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      item.approvalStatus === 'odobreno' && styles.statusApproved,
                      item.approvalStatus === 'odbijen' && styles.statusRejected,
                      item.approvalStatus === 'na čekanju' && styles.statusPending,
                    ]}>
                    <Text style={styles.statusText}>
                      {item.approvalStatus.charAt(0).toUpperCase() + item.approvalStatus.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Add in_transit badge */}
                {item.in_transit && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}></Text>
                    <View style={styles.transitBadge}>
                      <Text style={styles.transitText}>U tranzitu</Text>
                    </View>
                  </View>
                )}

                {item.approvalStatus === 'odobreno' && item.approvedBy && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Potvrdio:</Text>
                      <Text style={styles.detailValue}>
                        {item.approvedBy.firstName} {item.approvedBy.lastName}
                      </Text>
                    </View>

                    {item.approvalDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Datum:</Text>
                        <Text style={styles.detailValue}>{item.approvalDate}</Text>
                      </View>
                    )}

                    <View style={styles.photosContainer}>
                      {renderPhotoPreview('front')}
                      {renderPhotoPreview('back')}
                    </View>
                  </>
                )}

                {item.approvalStatus === 'na čekanju' && (
                  <TouchableOpacity style={styles.approveButton} onPress={handleApprovePress}>
                    <Text style={styles.approveButtonText}>Odobri</Text>
                  </TouchableOpacity>
                )}

                {userProfile?.role === 'admin' && (
                  <TouchableOpacity
                    style={[styles.approveButton, styles.deleteButton]}
                    onPress={handleDeletePress}>
                    <Text style={styles.approveButtonText}>Obriši</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item._id === nextProps.item._id &&
      prevProps.item.approvalStatus === nextProps.item.approvalStatus &&
      prevProps.item.in_transit === nextProps.item.in_transit && // Add in_transit to memo check
      prevProps.userToken === nextProps.userToken &&
      prevProps.userProfile?.role === nextProps.userProfile?.role
    );
  }
);

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemContent: {
    padding: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  detailsContainer: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    width: 90,
    color: '#666',
    fontSize: 14,
  },
  detailValue: {
    flex: 1,
    color: '#000',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#e6f4ea',
  },
  statusPending: {
    backgroundColor: '#fff3e0',
  },
  statusRejected: {
    backgroundColor: '#fce8e8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  // Add styles for in_transit badge
  transitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd', // Light blue background
    marginTop: 2,
  },
  transitText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1976d2', // Blue text
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    marginLeft: 8,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  photosContainer: {
    marginTop: 10,
    gap: 8,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  viewPhotoText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  rightActionContainer: {
    backgroundColor: '#f5f5f5',
    width: Dimensions.get('window').width * 0.8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

export default ItemCard;
