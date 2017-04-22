package com.example.danielstrizhevsky.ridesharingapp;

import android.Manifest;
import android.location.Location;
import android.os.Handler;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.ActivityCompat;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.common.api.Status;
import com.google.android.gms.location.LocationListener;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.places.Place;
import com.google.android.gms.location.places.ui.PlaceAutocompleteFragment;
import com.google.android.gms.location.places.ui.PlaceSelectionListener;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.MapFragment;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;

import org.json.JSONException;
import org.json.JSONObject;
import org.w3c.dom.Text;

public class MainActivity extends AppCompatActivity implements GoogleApiClient.ConnectionCallbacks,
        GoogleApiClient.OnConnectionFailedListener, OnMapReadyCallback, LocationListener {

    final int REQUEST_LOCATION = 1;
    final String SEARCH_URL = "http://ec2-204-236-203-31.compute-1.amazonaws.com:3000/search";
    final String CHECK_URL = "http://ec2-204-236-203-31.compute-1.amazonaws.com:3000/check";
    final String CANCEL_URL = "http://ec2-204-236-203-31.compute-1.amazonaws.com:3000/cancel";

    private GoogleApiClient mGoogleApiClient;
    private Location mLocation;
    private GoogleMap mGoogleMap;
    private LocationRequest mLocationRequest;
    private Marker mMarker;

    private MapFragment mMapFragment;
    private PlaceAutocompleteFragment mPlaceAutocompleteFragment;
    private SeekBar mDistanceSlider;
    private SeekBar mMinPeopleSlider;
    private TextView mDistanceText;
    private TextView mMinPeopleText;
    private ProgressBar mLoadingSpinner;

    private boolean mZoomed = false;
    private boolean mButtonStatus = true;  // true = submit, false = cancel

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        if (mGoogleApiClient == null) {
            mGoogleApiClient = new GoogleApiClient.Builder(this)
                    .addConnectionCallbacks(this)
                    .addOnConnectionFailedListener(this)
                    .addApi(LocationServices.API)
                    .build();
        }
        mLocationRequest = LocationRequest.create();

        mMapFragment = (MapFragment) getFragmentManager()
                .findFragmentById(R.id.map);
        mMapFragment.getMapAsync(this);

        mPlaceAutocompleteFragment = (PlaceAutocompleteFragment)
                getFragmentManager().findFragmentById(R.id.place_autocomplete_fragment);
        mPlaceAutocompleteFragment.setHint("Search destinations");
        mPlaceAutocompleteFragment.setOnPlaceSelectedListener(new PlaceSelectionListener() {
            @Override
            public void onPlaceSelected(Place place) {
                if (mMarker == null) {
                    mMarker = mGoogleMap.addMarker(new MarkerOptions().position(place.getLatLng()).draggable(true));
                } else {
                    mMarker.remove();
                    mMarker = mGoogleMap.addMarker(new MarkerOptions().position(place.getLatLng()).draggable(true));
                }
                mGoogleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(place.getLatLng(), 15
                ));
            }

            @Override
            public void onError(Status status) {
                // TODO: Handle the error.
                System.out.println("An error occurred: " + status);
            }
        });

        mDistanceText = (TextView) findViewById(R.id.distance_text);
        mDistanceSlider = (SeekBar) findViewById(R.id.distance_slider);
        mDistanceSlider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int i, boolean b) {
                if (i == 900) {
                    mDistanceText.setText("1 km");
                } else {
                    mDistanceText.setText((i + 100) + " m");
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {

            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {

            }
        });

        mMinPeopleText = (TextView) findViewById(R.id.min_num_text);
        mMinPeopleSlider = (SeekBar) findViewById(R.id.min_num_slider);
        mMinPeopleSlider.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int i, boolean b) {
                if (i == 0) {
                    mMinPeopleText.setText("1 (alone)");
                } else {
                    mMinPeopleText.setText((i + 1) + " people");
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {

            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {

            }
        });

        mLoadingSpinner = (ProgressBar) findViewById(R.id.loading_spinner);

        final Button sendDataButton = (Button) findViewById(R.id.send_data_button);

        final RequestQueue queue = Volley.newRequestQueue(this);

        sendDataButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {

                if (!mButtonStatus) {  // cancel clicked
                    JSONObject data = new JSONObject();
                    try {
                        data.put("userId", "test");  // placeholder
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }

                    JsonObjectRequest jsObjRequest = new JsonObjectRequest
                            (Request.Method.POST, CANCEL_URL, data, new Response.Listener<JSONObject>() {

                                @Override
                                public void onResponse(JSONObject response) {
                                    System.out.println(response);
                                    mLoadingSpinner.setVisibility(View.GONE);
                                    sendDataButton.setText("Submit");
                                    Toast.makeText(getApplicationContext(),
                                            "canceled", Toast.LENGTH_SHORT).show();
                                    mButtonStatus = true;
                                }
                            }, new Response.ErrorListener() {

                                @Override
                                public void onErrorResponse(VolleyError error) {
                                    Toast.makeText(getApplicationContext(), "error", Toast.LENGTH_SHORT).show();
                                }
                            });
                    queue.add(jsObjRequest);
                } else {

                    JSONObject data = new JSONObject();
                    JSONObject route = new JSONObject();
                    JSONObject preferences = new JSONObject();
                    System.out.println(mMarker.getPosition().longitude);
                    System.out.println(mMarker.getPosition().latitude);

                    if (mLocation != null && mMarker != null) {
                        try {
                            route.put("startLongitude", mLocation.getLongitude());
                            route.put("startLatitude", mLocation.getLatitude());
                            route.put("endLongitude", mMarker.getPosition().longitude);
                            route.put("endLatitude", mMarker.getPosition().latitude);
                            preferences.put("maxDistance", mDistanceSlider.getProgress() + 100);
                            preferences.put("minPeople", mMinPeopleSlider.getProgress() + 1);
                            data.put("userId", "test"); // placeholder
                            data.put("route", route);
                            data.put("preferences", preferences);
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }
                    }

                    JsonObjectRequest jsObjRequest = new JsonObjectRequest
                            (Request.Method.POST, SEARCH_URL, data, new Response.Listener<JSONObject>() {

                                @Override
                                public void onResponse(JSONObject response) {
                                    System.out.println(response);
                                    mLoadingSpinner.setVisibility(View.VISIBLE);
                                    sendDataButton.setText("Cancel");
                                    mButtonStatus = false;
                                    Toast.makeText(getApplicationContext(),
                                            "lat:" + mLocation.getLatitude() + ", long:" + mLocation.getLongitude(),
                                            Toast.LENGTH_SHORT)
                                            .show();
                                }
                            }, new Response.ErrorListener() {

                                @Override
                                public void onErrorResponse(VolleyError error) {
                                    Toast.makeText(getApplicationContext(), "error", Toast.LENGTH_SHORT).show();
                                }
                            });
                    queue.add(jsObjRequest);

                    new Handler().postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            final Runnable r = this;
                            JSONObject data = new JSONObject();
                            try {
                                data.put("userId", "test"); // placeholder
                            } catch (JSONException e) {
                                e.printStackTrace();
                            }
                            JsonObjectRequest jsObjRequest = new JsonObjectRequest
                                    (Request.Method.POST, CHECK_URL, data, new Response.Listener<JSONObject>() {

                                        @Override
                                        public void onResponse(JSONObject response) {
                                            System.out.println(response);
                                            try {
                                                Toast.makeText(getApplicationContext(),
                                                        response.getString("status"), Toast.LENGTH_SHORT).show();
                                                if (response.getString("status").equals("searching")) {
                                                    mLoadingSpinner.setVisibility(View.VISIBLE);
                                                    new Handler().postDelayed(r, 3000);
                                                } else {
                                                    mLoadingSpinner.setVisibility(View.GONE);
                                                }
                                            } catch (JSONException e) {
                                                e.printStackTrace();
                                            }
                                        }
                                    }, new Response.ErrorListener() {

                                        @Override
                                        public void onErrorResponse(VolleyError error) {
                                            Toast.makeText(getApplicationContext(), "error", Toast.LENGTH_SHORT).show();
                                        }
                                    });
                            queue.add(jsObjRequest);
                        }
                    }, 3000);
                }
            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();
        mGoogleApiClient.connect();
    }

    @Override
    protected void onStop() {
        super.onStop();
        mGoogleApiClient.disconnect();
    }

    @Override
    public void onConnected(@Nullable Bundle bundle) {
        if (mGoogleApiClient.isConnected()) {
            if (ActivityCompat.checkSelfPermission(getApplicationContext(),
                    Manifest.permission.ACCESS_FINE_LOCATION)
                    != getPackageManager().PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(getParent(),
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                        REQUEST_LOCATION);
            } else {
                LocationServices.FusedLocationApi.requestLocationUpdates(mGoogleApiClient,
                        mLocationRequest, this);
            }
        }
    }

    @Override
    public void onConnectionSuspended(int i) {

    }

    @Override
    public void onConnectionFailed(@NonNull ConnectionResult connectionResult) {

    }

    @Override
    public void onMapReady(final GoogleMap googleMap) {
        mGoogleMap = googleMap;
        if (ActivityCompat.checkSelfPermission(getApplicationContext(),
                Manifest.permission.ACCESS_FINE_LOCATION)
                != getPackageManager().PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getParent(),
                    new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                    REQUEST_LOCATION);
        } else {
            mGoogleMap.setMyLocationEnabled(true);
        }
        mGoogleMap.setOnMapClickListener(new GoogleMap.OnMapClickListener() {
            @Override
            public void onMapClick(LatLng latLng) {
                if (mMarker != null) {
                    mMarker.remove();
                }
                mMarker = mGoogleMap.addMarker(new MarkerOptions().position(latLng).draggable(true));
                mPlaceAutocompleteFragment.setText("Marker location");
            }
        });
        mGoogleMap.setOnMarkerDragListener(new GoogleMap.OnMarkerDragListener() {
            @Override
            public void onMarkerDragStart(Marker marker) {

            }

            @Override
            public void onMarkerDrag(Marker marker) {

            }

            @Override
            public void onMarkerDragEnd(Marker marker) {

            }
        });
    }

    @Override
    public void onLocationChanged(Location location) {
        System.out.println(location);
        mLocation = location;
        if (!mZoomed) {
            mGoogleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(
                    new LatLng(mLocation.getLatitude(), mLocation.getLongitude()), 15
            ));
            mZoomed = true;
        }
    }
}
