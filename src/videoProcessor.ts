import ffmpeg from 'fluent-ffmpeg';

import { promisify } from "node:util";

interface Metadata {
    streams: [{
        width: number;
        height: number;
    }],
    format: {
        size: number;
        duration: number;
    };
}

const ffprobe = promisify(ffmpeg.ffprobe) as unknown as (path: string) => Promise<Metadata>;

// bitrate: 1000k, fps: 28
const ffmpegOptions = ['-c:v libx264', `-b:v 1000k`, '-c:a aac', '-b:a 58k', '-r 28'];

export const compressVideo = async (inputPath: string, outputPath: string) => {
    const metadata = await ffprobe(inputPath);

    const width = metadata.streams[0].width;
    const height = metadata.streams[0].height;

    return new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions(ffmpegOptions)
            .size(`${width}x${height}`)
            .on('error', (err) => reject(err))
            .on('end', () => resolve())
            .save(outputPath);
    });
}