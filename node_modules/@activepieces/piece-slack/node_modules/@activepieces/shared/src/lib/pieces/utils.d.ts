import { PiecePackage } from './piece';
export declare const getPackageAliasForPiece: (params: GetPackageAliasForPieceParams) => string;
export declare const getPackageSpecForPiece: (packageArchivePath: string, params: PiecePackage) => string;
export declare const getPackageArchivePathForPiece: (params: GetPackageArchivePathForPieceParams) => string;
export declare const extractPieceFromModule: <T>(params: ExtractPieceFromModuleParams) => T;
export declare const getPieceMajorAndMinorVersion: (pieceVersion: string) => string;
type GetPackageAliasForPieceParams = {
    pieceName: string;
    pieceVersion: string;
};
type GetPackageArchivePathForPieceParams = {
    archiveId: string;
    archivePath: string;
};
type ExtractPieceFromModuleParams = {
    module: Record<string, unknown>;
    pieceName: string;
    pieceVersion: string;
};
export {};
