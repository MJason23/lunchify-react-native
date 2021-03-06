/**
 * @author Sallar Kaboli <sallar.kaboli@gmail.com>
 * @date 27.05.2015
 */
'use strict';

/**
 * Required Modules
 */
var React             = require('react-native'),
    moment            = require('moment'),
    Loading           = require('./Loading'),
    Helpers           = require('../utils/Helpers'),
    Data              = require('../utils/Data'),
    VenuesItemView    = require('./VenuesItem'),
    VenueView         = require('./Venue'),
    MapView           = require('./Map'),
    RightButton       = require('./RightButton'),
    Icon              = require('react-native-vector-icons/MaterialIcons'),
    RCTRefreshControl = require('react-refresh-control'),
    /* Styles */
    {
        Stylesheet,
        VenuesStyles,
        ListStyles
        } = require('../utils/Styles'),
    /* React */
    {
        View,
        Text,
        Component,
        ListView,
        TouchableHighlight,
        AlertIOS,
        LinkingIOS
        } = React,
    /* Options */
    LISTVIEWREF     = 'ListView',
    GPSOptions   = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 1000
    },
    /* Data Source */
    baseDataSource = new ListView.DataSource({
        rowHasChanged: (r1, r2) => r1.id !== r2.id
    });

/**
 * Venues View
 */
class VenuesView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            dataSource: baseDataSource,
            isLoading: false
        };
    }

    componentDidMount() {
        // Turn Geo Callback into a promise
        var geoPromiseResolve,
            refPromise = Data.load(api + '/venues'),
            geoPromise = new Promise(function(resolve) {
                geoPromiseResolve = resolve;
            }),
            _this = this;

        // Wait for all promises to resolve
        Promise.all([refPromise, geoPromise]).then(([response, initialPosition]) => {
            // Calc Distances
            var venues = _this.calcDistances(response, initialPosition);

            // Set State
            _this.setState({
                venues: venues,
                dataSource: baseDataSource.cloneWithRows(venues)
            });
        });

        // Call Geo location
        navigator.geolocation.getCurrentPosition(geoPromiseResolve);
        //(geoPromiseResolve)({coords: {latitude: 60.1764360, longitude: 24.8306610}});

        // ScrollView
        RCTRefreshControl.configure({
            node: this.refs[LISTVIEWREF]
        }, () => {
            this.recalcDistance();
        });
    }

    calcDistances(data, geo) {
        // Calc Distances
        for(var index in data) {
            var item = data[index];

            item.distance = Helpers.calcDistance({
                lat: geo.coords.latitude,
                lng: geo.coords.longitude
            }, {
                lat: item.location[1],
                lng: item.location[0]
            });
        }

        // Closest first
        data.sort((a, b) => {
            return a.distance - b.distance;
        });

        return data;
    }

    recalcDistance() {
        var _this = this;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setTimeout(() => {
                    _this.setState({
                        dataSource: baseDataSource.cloneWithRows(
                            _this.calcDistances(_this.state.venues, position)
                        ),
                        lastPosition: position
                    });
                    RCTRefreshControl.endRefreshing(_this.refs[LISTVIEWREF]);
                }, 500);
            }
        );
    }

    getDate() {
        return moment('2015-07-17').format('YYYY-MM-DD');
    }

    toVenue(venue, view) {
        var refPromise = Data.load(api + '/venues/' + venue._id + '/' + this.getDate());

        // Start Loading
        view.setState({ isLoading: true });

        // Get promised data
        refPromise.then((response) => {
            view.setState({ isLoading: false });

            this.props.nav.push({
                title: venue.name,
                component: VenueView,
                data: {
                    venue: venue,
                    menu: response.meals
                },
                /* Map Button */
                rightButton: RightButton({
                    icon: 'map',
                    onPress: () => this.props.nav.push({
                        title: 'Map',
                        component: MapView,
                        data: venue,
                        /* Directions Button */
                        rightButton: RightButton({
                            icon: 'ios-navigate-outline',
                            onPress: this.alertDirections.bind(this, venue)
                        })
                    })
                })
            });
        });
    }

    alertDirections(venue) {
        var urls = {
            google: 'comgooglemaps://?daddr='+venue.address+', Finland&saddr=&directionsmode=walking',
            apple: 'http://maps.apple.com/?daddr='+venue.address+', Finland&saddr=Current Location'
        }
        AlertIOS.alert(
            'Directions',
            'Choose the method you like:',
            [{
                text: 'Google Maps',
                onPress: () => {
                    LinkingIOS.canOpenURL(urls.google, (supported) => {
                        if (!supported) {
                            AlertIOS.alert('Google Maps Is Not Installed.');
                        } else {
                            LinkingIOS.openURL(urls.google);
                        }
                    });
                }
            },
            {
                text: 'Apple Maps',
                onPress: () => {
                    LinkingIOS.openURL(urls.apple);
                }
            },
            {
                text: 'Cancel'
            }]
        )
    }

    renderVenue(venue) {
        return (
            <VenuesItemView
                onPress={this.toVenue.bind(this, venue)}
                isLoading={this.state.isLoading}
                venue={venue}
                />
        )
    }

    renderLoading() {
        if( this.state.dataSource.getRowCount() === 0 ) {
            return (
                <Loading>closest venues...</Loading>
            );
        }
    }

    render() {
        return (
            <View style={Stylesheet.flex}>
                {this.renderLoading.call(this)}
                <ListView
                    ref={LISTVIEWREF}
                    dataSource={this.state.dataSource}
                    renderRow={this.renderVenue.bind(this)}
                    automaticallyAdjustContentInsets={false}
                    />
            </View>
        )
    }
}

/**
 * Styles
 */
module.exports = VenuesView;
