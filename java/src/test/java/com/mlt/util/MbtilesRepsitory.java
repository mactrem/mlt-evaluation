package com.mlt.util;

import com.mlt.converter.encodings.EncodingUtils;
import com.mlt.converter.mvt.ColumnMapping;
import com.mlt.converter.mvt.MapboxVectorTile;
import com.mlt.converter.mvt.MvtUtils;
import org.apache.commons.lang3.tuple.Triple;
import org.jetbrains.annotations.NotNull;

import java.io.BufferedInputStream;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.*;
import java.util.zip.GZIPInputStream;

public class MbtilesRepsitory implements Iterable<MapboxVectorTile>, Closeable {
    private static final String TILE_TABLE_NAME = "tiles";
    private final Connection connection;
    private final Statement statement;
    private final Optional<List<ColumnMapping>> columnMappings;
    protected final int minZoom;
    protected final int maxZoom;

    public MbtilesRepsitory(String url, int minZoom, int maxZoom, List<ColumnMapping> columnMappings)
            throws ClassNotFoundException, SQLException {
        Class.forName("org.sqlite.JDBC");
        this.connection = DriverManager.getConnection(url);
        this.statement = this.connection.createStatement();
        this.minZoom = minZoom;
        this.maxZoom = maxZoom;
        this.columnMappings = Optional.ofNullable(columnMappings);
    }

    public List<Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile>> getAllTiles() {
        var tiles = new ArrayList<Triple<Triple<Integer, Integer, Integer>, byte[], MapboxVectorTile>>();

        try {
            var rs = statement.executeQuery(String.format("SELECT * FROM %s;", TILE_TABLE_NAME));

            while (rs.next()) {
                int z = rs.getInt("zoom_level");
                int x = rs.getInt("tile_column");
                int y = rs.getInt("tile_row");
                var tileId = Triple.of(z, x, y);

                InputStream in = rs.getBinaryStream("tile_data");
                byte[] mvt = new byte[in.available()];
                in.read(mvt);

                if(mvt.length == 0){
                    continue;
                }

                var uncompressedMvt = isGzipped(mvt) ? EncodingUtils.unzip(mvt) : mvt;
                var decodedMvt = MvtUtils.decodeMvt(uncompressedMvt, this.columnMappings);
                tiles.add(Triple.of(tileId, uncompressedMvt, decodedMvt));
            }

            return tiles;
        } catch (SQLException | IOException e) {
            throw new RuntimeException(e);
        }
    }

    protected MapboxVectorTile getTile(Triple<Integer, Integer, Integer> tileId) {
        try {
            var rs =
                    statement.executeQuery(
                            String.format(
                                    "SELECT * FROM %s WHERE zoom_level = %d AND"
                                            + " tile_column = %d AND tile_row = %d;",
                                    TILE_TABLE_NAME, tileId.getLeft(), tileId.getMiddle(), tileId.getRight()));

            rs.next();
            InputStream in = rs.getBinaryStream("tile_data");
            byte[] mvt = new byte[in.available()];
            in.read(mvt);

            var uncompressedMvt = EncodingUtils.unzip(mvt);
            return MvtUtils.decodeMvt(uncompressedMvt, this.columnMappings);
        } catch (SQLException | IOException e) {
            throw new RuntimeException(e);
        }
    }

    protected byte[] getRawTile(Triple<Integer, Integer, Integer> tileId)
            throws SQLException, IOException {
        var rs =
                statement.executeQuery(
                        String.format(
                                "SELECT * FROM %s WHERE zoom_level = %d AND"
                                        + " tile_column = %d AND tile_row = %d;",
                                TILE_TABLE_NAME, tileId.getLeft(), tileId.getMiddle(), tileId.getRight()));

        rs.next();
        InputStream in = rs.getBinaryStream("tile_data");
        byte[] mvt = new byte[in.available()];
        in.read(mvt);

        return EncodingUtils.unzip(mvt);
    }

    public List<Triple<byte[], MapboxVectorTile, Triple<Integer, Integer, Integer>>> getLargestTilesPerZoom() {
        try {
            var mvTiles =
                    new ArrayList<Triple<byte[], MapboxVectorTile, Triple<Integer, Integer, Integer>>>();
            for (var zoom = 0; zoom <= maxZoom; zoom++) {
                var rs =
                        statement.executeQuery(
                                String.format(
                                        "SELECT * FROM %s WHERE zoom_level = %d "
                                                + "ORDER BY LENGTH(tile_data) DESC LIMIT 1;",
                                        TILE_TABLE_NAME, zoom));

                rs.next();
                InputStream in = rs.getBinaryStream("tile_data");
                byte[] mvt = new byte[in.available()];
                in.read(mvt);
                var x = rs.getInt("tile_column");
                var y = rs.getInt("tile_row");

                var uncompressedMvt = EncodingUtils.unzip(mvt);
                var decodedMvt = MvtUtils.decodeMvt(uncompressedMvt, this.columnMappings);
                var tileId = Triple.of(zoom, x, y);
                mvTiles.add(Triple.of(uncompressedMvt, decodedMvt, tileId));
            }

            return mvTiles;
        } catch (SQLException | IOException e) {
            throw new RuntimeException(e);
        }
    }

    public Queue<Triple<Integer, Integer, Integer>> getTileIds() {
        try {
            // TODO: read in batches to scale also for a planet-scale tileset
            var rs =
                    statement.executeQuery(
                            String.format(
                                    "SELECT * FROM %s WHERE zoom_level >= %d AND zoom_level <= %d",
                                    TILE_TABLE_NAME, minZoom, maxZoom));
            var tileIds = new LinkedList<Triple<Integer, Integer, Integer>>();
            while (rs.next()) {
                int z = rs.getInt("zoom_level");
                int x = rs.getInt("tile_column");
                int y = rs.getInt("tile_row");
                var tileId = Triple.of(z, x, y);
                tileIds.add(tileId);
            }

            return tileIds;
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public void close() {
        try {
            statement.close();
            connection.close();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public static boolean isGzipped(byte[] mvt) throws IOException {
        var magic = mvt[0] & 0xff | ((mvt[1] << 8) & 0xff00);
        return magic == GZIPInputStream.GZIP_MAGIC;
    }

    @NotNull
    @Override
    public Iterator<MapboxVectorTile> iterator() {
        return new MbtilesIterator();
    }

    private class MbtilesIterator implements Iterator<MapboxVectorTile> {
        private Queue<Triple<Integer, Integer, Integer>> tileIds;

        @Override
        public boolean hasNext() {
            if (tileIds == null) {
                tileIds = getTileIds();
            }

            return !tileIds.isEmpty();
        }

        @Override
        public MapboxVectorTile next() {
            var tileId = tileIds.poll();
            var tile = getTile(tileId);
            tile.setTileId(tileId);
            return tile;
        }
    }
}
