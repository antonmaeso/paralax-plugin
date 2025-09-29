export function createMetric(video, detection, timestamp) {
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) {
        return null;
    }
    const { x, y, width, height } = detection.boundingBox;
    const relativeBox = {
        x: clamp(x / videoWidth),
        y: clamp(y / videoHeight),
        width: clamp(width / videoWidth),
        height: clamp(height / videoHeight)
    };
    const normalizedLandmarks = (detection.landmarks ?? []).map((landmark) => {
        const points = landmark.locations
            .map((point) => normalize(point, videoWidth, videoHeight));
        if (landmark.type === undefined) {
            return { points };
        }
        return { type: landmark.type, points };
    });
    const eyes = extractEyes(detection.landmarks ?? [], videoWidth, videoHeight);
    return {
        timestamp,
        box: { x, y, width, height },
        relativeBox,
        center: {
            x: clamp(relativeBox.x + relativeBox.width / 2),
            y: clamp(relativeBox.y + relativeBox.height / 2)
        },
        landmarks: normalizedLandmarks,
        eyes
    };
}
function extractEyes(landmarks, videoWidth, videoHeight) {
    const result = {};
    for (const landmark of landmarks) {
        if (!landmark.locations.length) {
            continue;
        }
        const type = landmark.type?.toLowerCase();
        const point = averagePoints(landmark.locations, videoWidth, videoHeight);
        if (!point) {
            continue;
        }
        if (type && type.includes('left') && type.includes('eye')) {
            result.left = point;
            continue;
        }
        if (type && type.includes('right') && type.includes('eye')) {
            result.right = point;
            continue;
        }
        if (type === 'eye') {
            if (!result.left) {
                result.left = point;
            }
            else if (!result.right) {
                result.right = point;
            }
        }
    }
    return result;
}
function averagePoints(locations, videoWidth, videoHeight) {
    if (locations.length === 0) {
        return undefined;
    }
    let sumX = 0;
    let sumY = 0;
    for (const location of locations) {
        const normalized = normalize(location, videoWidth, videoHeight);
        sumX += normalized.x;
        sumY += normalized.y;
    }
    const count = locations.length;
    return {
        x: clamp(sumX / count),
        y: clamp(sumY / count)
    };
}
function normalize(point, videoWidth, videoHeight) {
    return {
        x: clamp(point.x / videoWidth),
        y: clamp(point.y / videoHeight)
    };
}
function clamp(value, min = 0, max = 1) {
    if (Number.isNaN(value)) {
        return 0;
    }
    return Math.max(min, Math.min(max, value));
}
//# sourceMappingURL=metric-factory.js.map